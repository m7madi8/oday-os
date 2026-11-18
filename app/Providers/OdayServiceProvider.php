<?php

namespace App\Providers;

use App\Services\Oday\Backup\BackupEngine;
use App\Services\Oday\Backup\BackupRunner;
use App\Services\Oday\OdayDashboardTokenGuard;
use Illuminate\Support\ServiceProvider;

class OdayServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(BackupRunner::class, BackupEngine::class);
    }

    public function boot(): void
    {
        OdayDashboardTokenGuard::ensureProductionConfigured($this->app);

        // Backup and Google OAuth settings are validated when those features are used
        // (see App\Services\Oday\Backup\OdayBackupRequirements).
    }
}
