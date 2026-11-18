<?php

namespace App\Services\Oday\Backup;

use App\Services\Oday\GoogleDriveBackupOAuthConfig;
use RuntimeException;

/**
 * Validates ODAY backup / Google Drive configuration when those features are used.
 */
final class OdayBackupRequirements
{
    public static function encryptionKeyConfigured(): bool
    {
        return trim((string) config('oday.backup.encryption_key')) !== '';
    }

    public static function assertEncryptionConfigured(): void
    {
        if (! self::encryptionKeyConfigured()) {
            throw new RuntimeException(
                'BACKUP_ENCRYPTION_KEY is not configured. Set it in .env before using ODAY OS backups.'
            );
        }
    }

    /**
     * @return list<string> Environment variable names that are missing or empty.
     */
    public static function missingGoogleOAuthEnv(): array
    {
        $candidates = [
            'GOOGLE_CLIENT_ID' => GoogleDriveBackupOAuthConfig::clientId(),
            'GOOGLE_CLIENT_SECRET' => GoogleDriveBackupOAuthConfig::clientSecret(),
            'GOOGLE_REDIRECT_URI' => (string) config('oday.backup.google_redirect_uri'),
        ];

        $missing = [];
        foreach ($candidates as $name => $value) {
            if (trim((string) $value) === '') {
                $missing[] = $name;
            }
        }

        return $missing;
    }

    public static function assertGoogleOAuthConfigured(): void
    {
        $missing = self::missingGoogleOAuthEnv();
        if ($missing === []) {
            return;
        }

        throw new RuntimeException(
            'Google Drive backup OAuth is not configured. Set these environment variables in .env: '
            .implode(', ', $missing)
        );
    }
}
