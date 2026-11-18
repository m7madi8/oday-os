<?php

namespace Tests\Feature\Oday;

use App\Models\Company;
use App\Services\OdayDashboardStore;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\MockAccountData;
use Tests\TestCase;

class OfficeSettingsIsolationTest extends TestCase
{
    use DatabaseTransactions;
    use MockAccountData;

    protected function setUp(): void
    {
        parent::setUp();
        $this->makeTestData();
    }

    public function test_two_companies_do_not_read_each_others_office_settings(): void
    {
        Company::factory()->create(['account_id' => $this->account->id]);
        app(OdayDashboardStore::class)->put('office-settings', '{"officeName":"LEGACY-SHARED"}', 1);

        $headers = [
            'X-API-SECRET' => config('ninja.api_secret'),
            'X-API-TOKEN' => $this->token,
        ];

        $this->withHeaders($headers)
            ->getJson('/api/oday/mobile/office-settings')
            ->assertOk()
            ->assertJsonPath('settings', []);

        $this->withHeaders($headers)
            ->putJson('/api/oday/mobile/office-settings', [
                'settings' => ['officeName' => 'شركة الحالية'],
            ])
            ->assertOk()
            ->assertJsonPath('settings.officeName', 'شركة الحالية');

        $this->withHeaders($headers)
            ->getJson('/api/oday/mobile/office-settings')
            ->assertOk()
            ->assertJsonPath('settings.officeName', 'شركة الحالية');

        $items = $this->withHeaders($headers)->getJson('/api/oday/mobile/items')->assertOk()->json('items');
        $this->assertIsArray($items);
        $this->assertArrayNotHasKey('office-settings', $items);
        $encoded = json_encode($items);
        $this->assertStringNotContainsString('LEGACY-SHARED', (string) $encoded);
    }
}
