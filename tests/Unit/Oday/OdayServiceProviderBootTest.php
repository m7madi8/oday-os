<?php

namespace Tests\Unit\Oday;

use App\Providers\OdayServiceProvider;
use Illuminate\Foundation\Application;
use Tests\TestCase;

class OdayServiceProviderBootTest extends TestCase
{
    public function test_oday_service_provider_boots_without_backup_env(): void
    {
        config([
            'oday.google_drive_backup.client_id' => '',
            'oday.google_drive_backup.client_secret' => '',
            'oday.backup.google_redirect_uri' => '',
            'oday.backup.encryption_key' => '',
            'oday.backup.cron_secret' => '',
        ]);

        $provider = new OdayServiceProvider($this->app);
        $provider->boot();

        $this->assertInstanceOf(Application::class, $this->app);
    }
}
