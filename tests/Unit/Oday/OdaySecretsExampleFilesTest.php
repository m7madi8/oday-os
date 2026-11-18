<?php

namespace Tests\Unit\Oday;

use Tests\TestCase;

class OdaySecretsExampleFilesTest extends TestCase
{
    public function test_env_example_has_no_embedded_app_key_material(): void
    {
        $contents = (string) file_get_contents(base_path('.env.example'));

        $this->assertStringContainsString('APP_KEY=', $contents);
        $this->assertStringContainsString('key:generate', $contents);
        $this->assertDoesNotMatchRegularExpression(
            '/APP_KEY=base64:[A-Za-z0-9+\/]{20,}/',
            $contents,
            'APP_KEY in .env.example must be empty or a placeholder, not a usable key'
        );
    }

    public function test_config_oday_has_no_default_dashboard_sync_token(): void
    {
        $contents = (string) file_get_contents(config_path('oday.php'));

        $this->assertStringNotContainsString('oday-office-sync', $contents);
        $this->assertStringContainsString("env('ODAY_DASHBOARD_TOKEN', '')", $contents);
    }

    public function test_dev_sync_plugin_has_no_hardcoded_default_token(): void
    {
        $path = base_path('dashboard/server/odaySyncPlugin.js');
        $contents = (string) file_get_contents($path);

        $this->assertStringNotContainsString('oday-office-sync', $contents);
    }

    public function test_env_example_has_no_weak_literal_update_or_phantom_secrets(): void
    {
        $contents = (string) file_get_contents(base_path('.env.example'));

        $this->assertDoesNotMatchRegularExpression('/^UPDATE_SECRET=secret\s*$/m', $contents);
        $this->assertDoesNotMatchRegularExpression('/^PHANTOMJS_SECRET=secret\s*$/m', $contents);
    }
}
