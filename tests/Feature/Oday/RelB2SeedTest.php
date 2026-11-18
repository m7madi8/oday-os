<?php

namespace Tests\Feature\Oday;

use App\Utils\Traits\MakesHash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\MockAccountData;
use Tests\TestCase;

/**
 * Opt-in seed for the packaged Electron drill. Skipped unless ODAY_RELB2_SEED=1.
 */
class RelB2SeedTest extends TestCase
{
    use MakesHash;
    use MockAccountData;

    public function test_seed_desktop_account(): void
    {
        if (getenv('ODAY_RELB2_SEED') !== '1') {
            $this->markTestSkipped('REL-B2 seed is opt-in');
        }

        $this->assertSame('oday_relb2', (string) DB::select('SELECT DATABASE() AS d')[0]->d);
        $this->assertSame('3307', (string) config('database.connections.db-ninja-03.port'));

        $this->makeTestData();
        $settings = $this->company->settings;
        $settings->name = 'مكتب التحقق';
        $settings->currency_id = '6';
        $this->company->settings = $settings;
        $this->company->save();

        $this->user->email = 'relb2.office@example.test';
        $this->user->password = Hash::make('RelB2-Office-1842');
        $this->user->save();

        $this->client->name = 'عميل السطح';
        $clientSettings = $this->client->settings;
        $clientSettings->currency_id = '6';
        $this->client->settings = $clientSettings;
        $this->client->save();

        $invoice = $this->withHeaders([
            'X-API-SECRET' => config('ninja.api_secret'),
            'X-API-TOKEN' => $this->token,
        ])->postJson('/api/v1/invoices?mark_sent=true', [
            'client_id' => $this->client->hashed_id,
            'public_notes' => 'فاتورة سطح المكتب',
            'line_items' => [[
                'quantity' => 1,
                'cost' => '1234.56',
                'product_key' => 'خدمات هندسية',
                'notes' => 'خدمات هندسية',
            ]],
        ]);
        $invoice->assertSuccessful();
        $stored = (string) DB::table('invoices')->where('id', $this->decodePrimaryKey($invoice->json('data.id')))->value('amount');
        $this->assertSame(0, bccomp($stored, '1234.56', 6));
    }
}
