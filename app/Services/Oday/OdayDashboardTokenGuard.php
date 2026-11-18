<?php

namespace App\Services\Oday;

use Illuminate\Contracts\Foundation\Application;
use RuntimeException;

/**
 * Ensures the legacy dashboard sync token (X-ODAY-TOKEN / api/oday/items) is configured in production.
 */
final class OdayDashboardTokenGuard
{
    public static function ensureProductionConfigured(?Application $app = null): void
    {
        $app ??= app();

        if ($app->runningUnitTests()) {
            return;
        }

        if (! $app->environment('production')) {
            return;
        }

        if (trim((string) config('oday.dashboard_token')) === '') {
            throw new RuntimeException(
                'ODAY_DASHBOARD_TOKEN must be set in production (.env). '
                .'Generate a long random secret; do not use shared or example values.'
            );
        }
    }
}
