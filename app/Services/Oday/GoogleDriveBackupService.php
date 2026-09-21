<?php

namespace App\Services\Oday;

use Google\Client as GoogleClient;
use Google\Service\Drive;
use Google\Service\Drive\DriveFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class GoogleDriveBackupService
{
    public const OAUTH_STATE_PREFIX = 'oday:google-drive:';

    public function __construct(private GoogleDriveBackupTokenStore $tokens) {}

    public function redirectUri(): string
    {
        $configured = trim((string) config('oday.google_drive_backup.redirect_uri'));
        if ($configured !== '') {
            return $configured;
        }

        return rtrim((string) config('app.url'), '/').'/api/oday/backup/google/callback';
    }

    public function createOAuthState(int $companyId, int $userId): string
    {
        $state = Str::random(48);
        Cache::put(self::OAUTH_STATE_PREFIX.$state, [
            'company_id' => $companyId,
            'user_id' => $userId,
        ], now()->addMinutes(15));

        return $state;
    }

    public function consumeOAuthState(string $state): ?array
    {
        $key = self::OAUTH_STATE_PREFIX.$state;
        $payload = Cache::pull($key);

        return is_array($payload) ? $payload : null;
    }

    public function authorizationUrl(string $state): string
    {
        $client = $this->baseClient();
        $client->setAccessType('offline');
        $client->setPrompt('consent');
        $client->setState($state);
        $client->setRedirectUri($this->redirectUri());
        $client->setScopes([
            Drive::DRIVE_FILE,
            'https://www.googleapis.com/auth/userinfo.email',
        ]);

        return $client->createAuthUrl();
    }

    public function exchangeAuthorizationCode(string $code): array
    {
        $client = $this->baseClient();
        $client->setRedirectUri($this->redirectUri());
        $token = $client->fetchAccessTokenWithAuthCode($code);

        if (! is_array($token) || isset($token['error'])) {
            $message = is_array($token) ? (string) ($token['error_description'] ?? $token['error'] ?? 'oauth_error') : 'oauth_error';
            throw new \RuntimeException($message);
        }

        $client->setAccessToken($token);
        $oauth2 = new \Google\Service\Oauth2($client);
        $profile = $oauth2->userinfo->get();
        $email = (string) ($profile->email ?? '');

        return [
            'token' => $token,
            'email' => $email,
            'connected_at' => now()->toIso8601String(),
        ];
    }

    public function saveConnection(int $companyId, array $connection): void
    {
        $this->tokens->save($companyId, $connection);
    }

    public function disconnect(int $companyId): void
    {
        $this->tokens->delete($companyId);
    }

    public function status(int $companyId): array
    {
        $stored = $this->tokens->read($companyId);
        if (! $stored) {
            return [
                'connected' => false,
                'email' => null,
                'connected_at' => null,
                'last_backup_at' => null,
                'last_backup_name' => null,
            ];
        }

        return [
            'connected' => true,
            'email' => $stored['email'] ?? null,
            'connected_at' => $stored['connected_at'] ?? null,
            'last_backup_at' => $stored['last_backup_at'] ?? null,
            'last_backup_name' => $stored['last_backup_name'] ?? null,
        ];
    }

    public function uploadJsonBackup(int $companyId, string $json): array
    {
        $stored = $this->tokens->read($companyId);
        if (! $stored || ! is_array($stored['token'] ?? null)) {
            throw new \RuntimeException('google_not_connected');
        }

        $client = $this->authenticatedClient($stored['token']);
        $drive = new Drive($client);

        $stamp = now()->format('Y-m-d-His');
        $fileName = "oday-os-backup-{$stamp}.json";

        $meta = new DriveFile([
            'name' => $fileName,
            'mimeType' => 'application/json',
        ]);

        $created = $drive->files->create($meta, [
            'data' => $json,
            'mimeType' => 'application/json',
            'uploadType' => 'multipart',
            'fields' => 'id, name, webViewLink, createdTime',
        ]);

        $stored['last_backup_at'] = now()->toIso8601String();
        $stored['last_backup_name'] = $fileName;
        $stored['token'] = $client->getAccessToken();
        $this->tokens->save($companyId, $stored);

        return [
            'id' => $created->getId(),
            'name' => $created->getName(),
            'web_view_link' => $created->getWebViewLink(),
            'created_time' => $created->getCreatedTime(),
        ];
    }

    private function authenticatedClient(array $token): GoogleClient
    {
        $client = $this->baseClient();
        $client->setAccessToken($token);

        if ($client->isAccessTokenExpired()) {
            $refresh = $client->getRefreshToken();
            if (! $refresh) {
                throw new \RuntimeException('google_token_expired');
            }
            $client->fetchAccessTokenWithRefreshToken($refresh);
        }

        return $client;
    }

    private function baseClient(): GoogleClient
    {
        $client = new GoogleClient();
        $client->setClientId(GoogleDriveBackupOAuthConfig::clientId());
        $client->setClientSecret(GoogleDriveBackupOAuthConfig::clientSecret());

        return $client;
    }
}
