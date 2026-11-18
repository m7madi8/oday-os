<?php

namespace Tests\Feature\Oday;

use Tests\TestCase;

class OdayDashboardSyncAuthTest extends TestCase
{
    public function test_legacy_sync_routes_are_disabled(): void
    {
        config(['oday.dashboard_token' => 'correct-sync-secret-for-tests']);

        $this->withHeaders(['X-ODAY-TOKEN' => 'correct-sync-secret-for-tests'])->getJson('/api/oday/items')
            ->assertStatus(410)
            ->assertJsonPath('code', 'legacy_sync_disabled');

        $this->withHeaders(['X-ODAY-TOKEN' => 'correct-sync-secret-for-tests'])->putJson('/api/oday/items/office-settings', [
            'value' => '{}',
        ])->assertStatus(410);
    }
}
