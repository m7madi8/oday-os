<?php

namespace App\Services\Oday;

/**
 * Google OAuth credentials for ODAY Drive backup (read from config / .env only).
 */
final class GoogleDriveBackupOAuthConfig
{
    public static function clientId(): string
    {
        return (string) config('oday.google_drive_backup.client_id');
    }

    public static function clientSecret(): string
    {
        return (string) config('oday.google_drive_backup.client_secret');
    }

    public static function redirectUri(): string
    {
        return (string) config('oday.google_drive_backup.redirect_uri');
    }
}
