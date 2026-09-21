<?php

namespace App\Services\Oday\Backup;

use App\Models\OdayBackupSetting;
use App\Services\Oday\GoogleDriveBackupOAuthConfig;
use Google\Client as GoogleClient;
use Google\Service\Drive;
use Google\Service\Drive\DriveFile;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;

final class BackupGoogleDriveService
{
    public const FOLDER_NAME = 'ODAY OS Backups';

    public function redirectUri(): string
    {
        return (string) config('oday.backup.google_redirect_uri');
    }

    public function signedState(int $companyId, int $userId): string
    {
        return Crypt::encryptString(json_encode([
            'company_id' => $companyId,
            'user_id' => $userId,
            'exp' => now()->addMinutes(15)->timestamp,
        ], JSON_THROW_ON_ERROR));
    }

    public function parseState(string $state): ?array
    {
        try {
            $payload = json_decode(Crypt::decryptString($state), true, 512, JSON_THROW_ON_ERROR);
            if (! is_array($payload) || ($payload['exp'] ?? 0) < now()->timestamp) {
                return null;
            }

            return $payload;
        } catch (\Throwable) {
            return null;
        }
    }

    public function authorizationUrl(string $state): string
    {
        $client = $this->baseClient();
        $client->setAccessType('offline');
        $client->setPrompt('consent');
        $client->setState($state);
        $client->setRedirectUri($this->redirectUri());
        $client->setScopes(['https://www.googleapis.com/auth/drive.file']);

        return $client->createAuthUrl();
    }

    public function connect(int $companyId, string $code): OdayBackupSetting
    {
        $client = $this->baseClient();
        $client->setRedirectUri($this->redirectUri());
        $token = $client->fetchAccessTokenWithAuthCode($code);
        if (! is_array($token) || isset($token['error'])) {
            throw new \RuntimeException('google_token_exchange_failed');
        }

        if (empty($token['refresh_token'])) {
            throw new \RuntimeException('google_refresh_token_missing');
        }

        $client->setAccessToken($token);
        $oauth2 = new \Google\Service\Oauth2($client);
        $profile = $oauth2->userinfo->get();
        $email = (string) ($profile->email ?? '');

        $settings = $this->settingsFor($companyId);
        $settings->google_refresh_token_encrypted = BackupEncryption::encryptToken((string) $token['refresh_token']);
        $settings->google_account_email = $email;
        $settings->drive_folder_id = $this->ensureFolder($client, $settings->drive_folder_id);
        $settings->save();

        return $settings;
    }

    public function disconnect(int $companyId): void
    {
        $settings = OdayBackupSetting::query()->where('company_id', $companyId)->first();
        if (! $settings) {
            return;
        }
        $settings->google_refresh_token_encrypted = null;
        $settings->google_account_email = null;
        $settings->drive_folder_id = null;
        $settings->save();
    }

    public function isConnected(int $companyId): bool
    {
        $settings = OdayBackupSetting::query()->where('company_id', $companyId)->first();

        return $settings && is_string($settings->google_refresh_token_encrypted) && $settings->google_refresh_token_encrypted !== '';
    }

    public function uploadEncryptedFile(int $companyId, string $localPath, string $fileName): array
    {
        $settings = OdayBackupSetting::query()->where('company_id', $companyId)->first();
        if (! $settings || ! $settings->google_refresh_token_encrypted) {
            throw new \RuntimeException('google_not_connected');
        }

        try {
            $client = $this->clientForSettings($settings);
        } catch (\Throwable $e) {
            if ($this->isInvalidGrant($e)) {
                $this->markDisconnected($settings, 'invalid_grant');
            }
            throw $e;
        }

        $folderId = $this->ensureFolder($client, $settings->drive_folder_id);
        if ($folderId !== $settings->drive_folder_id) {
            $settings->drive_folder_id = $folderId;
            $settings->save();
        }

        $drive = new Drive($client);
        $meta = new DriveFile([
            'name' => $fileName,
            'parents' => [$folderId],
        ]);

        $content = file_get_contents($localPath);
        if ($content === false) {
            throw new \RuntimeException('backup_read_failed');
        }

        $created = $drive->files->create($meta, [
            'data' => $content,
            'mimeType' => 'application/octet-stream',
            'uploadType' => 'multipart',
            'fields' => 'id, name, md5Checksum, size, webViewLink',
        ]);

        return [
            'id' => $created->getId(),
            'name' => $created->getName(),
            'md5Checksum' => $created->getMd5Checksum(),
            'size' => $created->getSize(),
            'web_view_link' => $created->getWebViewLink(),
        ];
    }

    public function deleteDriveFilesByPattern(int $companyId, array $keepFileNames): void
    {
        $settings = OdayBackupSetting::query()->where('company_id', $companyId)->first();
        if (! $settings?->drive_folder_id || ! $settings->google_refresh_token_encrypted) {
            return;
        }

        try {
            $client = $this->clientForSettings($settings);
        } catch (\Throwable) {
            return;
        }

        $drive = new Drive($client);
        $response = $drive->files->listFiles([
            'q' => sprintf("'%s' in parents and trashed = false", $settings->drive_folder_id),
            'fields' => 'files(id,name)',
            'pageSize' => 200,
        ]);

        foreach ($response->getFiles() as $file) {
            $name = (string) $file->getName();
            if (! preg_match('/^ODAY-Backup_\\d+_\\d{4}-\\d{2}-\\d{2}_\\d{6}_(auto|manual)\\.zip\\.enc$/', $name)) {
                continue;
            }
            if (in_array($name, $keepFileNames, true)) {
                continue;
            }
            try {
                $drive->files->delete($file->getId());
            } catch (\Throwable $e) {
                Log::warning('oday.backup.drive_delete_failed', ['message' => $e->getMessage()]);
            }
        }
    }

    private function clientForSettings(OdayBackupSetting $settings): GoogleClient
    {
        $refresh = BackupEncryption::decryptToken((string) $settings->google_refresh_token_encrypted);
        $client = $this->baseClient();
        $client->fetchAccessTokenWithRefreshToken($refresh);
        $token = $client->getAccessToken();
        if (! is_array($token) || isset($token['error'])) {
            if ($this->isInvalidGrantMessage(is_array($token) ? (string) ($token['error'] ?? '') : '')) {
                $this->markDisconnected($settings, 'invalid_grant');
            }
            throw new \RuntimeException('google_token_refresh_failed');
        }

        return $client;
    }

    private function ensureFolder(GoogleClient $client, ?string $existingId): string
    {
        $drive = new Drive($client);
        if ($existingId) {
            try {
                $drive->files->get($existingId, ['fields' => 'id, trashed']);
                return $existingId;
            } catch (\Throwable) {
                /* recreate */
            }
        }

        $folder = new DriveFile([
            'name' => self::FOLDER_NAME,
            'mimeType' => 'application/vnd.google-apps.folder',
        ]);
        $created = $drive->files->create($folder, ['fields' => 'id']);

        return (string) $created->getId();
    }

    private function baseClient(): GoogleClient
    {
        $client = new GoogleClient();
        $client->setClientId(GoogleDriveBackupOAuthConfig::clientId());
        $client->setClientSecret(GoogleDriveBackupOAuthConfig::clientSecret());

        return $client;
    }

    private function settingsFor(int $companyId): OdayBackupSetting
    {
        return OdayBackupSetting::query()->firstOrCreate(
            ['company_id' => $companyId],
            ['timezone' => config('app.timezone', 'UTC')]
        );
    }

    private function markDisconnected(OdayBackupSetting $settings, string $reason): void
    {
        $settings->google_refresh_token_encrypted = null;
        $settings->google_account_email = null;
        $settings->save();
        Log::info('oday.backup.google_disconnected', ['reason' => $reason, 'company_id' => $settings->company_id]);
    }

    private function isInvalidGrant(\Throwable $e): bool
    {
        return str_contains(strtolower($e->getMessage()), 'invalid_grant');
    }

    private function isInvalidGrantMessage(string $error): bool
    {
        return $error === 'invalid_grant';
    }
}
