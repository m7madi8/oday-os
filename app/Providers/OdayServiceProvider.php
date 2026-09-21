<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use RuntimeException;

class OdayServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        if ($this->app->runningUnitTests()) {
            return;
        }

        $this->ensureRequiredEnv();
    }

    private function ensureRequiredEnv(): void
    {
        $required = [
            'GOOGLE_CLIENT_ID' => config('oday.google_drive_backup.client_id'),
            'GOOGLE_CLIENT_SECRET' => config('oday.google_drive_backup.client_secret'),
            'GOOGLE_REDIRECT_URI' => config('oday.backup.google_redirect_uri'),
            'BACKUP_ENCRYPTION_KEY' => config('oday.backup.encryption_key'),
            'CRON_SECRET' => config('oday.backup.cron_secret'),
        ];

        $missing = [];
        foreach ($required as $name => $value) {
            if (! is_string($value) || trim($value) === '') {
                $missing[] = $name;
            }
        }

        if ($missing === []) {
            return;
        }

        throw new RuntimeException(
            'ODAY OS backup is not configured. Set these environment variables in .env: '
            . implode(', ', $missing)
        );
    }
}
