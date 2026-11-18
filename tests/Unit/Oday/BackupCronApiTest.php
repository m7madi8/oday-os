<?php

namespace Tests\Unit\Oday;

use Tests\TestCase;

class BackupCronApiTest extends TestCase
{
    public function test_run_scheduled_rejects_when_cron_secret_not_configured(): void
    {
        config(['oday.backup.cron_secret' => '']);

        $this->postJson('/api/backup/run-scheduled')
            ->assertStatus(401)
            ->assertJson(['message' => 'Unauthorized']);
    }

    public function test_run_scheduled_rejects_wrong_cron_secret(): void
    {
        config(['oday.backup.cron_secret' => 'cron-secret-for-http-test']);

        $this->withHeaders(['X-CRON-SECRET' => 'wrong-value'])
            ->postJson('/api/backup/run-scheduled')
            ->assertStatus(401)
            ->assertJson(['message' => 'Unauthorized']);
    }

    public function test_run_scheduled_does_not_require_api_token(): void
    {
        config(['oday.backup.cron_secret' => '']);

        $this->postJson('/api/backup/run-scheduled', [], [
            'X-API-TOKEN' => 'should-not-bypass-cron-gate',
        ])
            ->assertStatus(401)
            ->assertJson(['message' => 'Unauthorized']);
    }
}
