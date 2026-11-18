<?php

namespace Tests\Feature\Oday;

use App\Models\Invoice;
use App\Utils\Traits\MakesHash;
use Illuminate\Support\Facades\DB;
use Tests\MockAccountData;
use Tests\TestCase;

/**
 * Opt-in local Invoice Ninja PDF drill. Skipped unless ODAY_RELB1=1.
 */
class RelB1InvoicePdfTest extends TestCase
{
    use MakesHash;
    use MockAccountData;

    public function test_existing_invoice_pipeline_renders_a_local_pdf(): void
    {
        if (getenv('ODAY_RELB1') !== '1') {
            $this->markTestSkipped('REL-B1 drill is opt-in');
        }

        $chromium = (string) getenv('SNAPPDF_CHROMIUM_PATH');
        $this->assertNotSame('', $chromium);
        $this->assertFalse(str_contains($chromium, ' '), 'Chromium path must not contain spaces');
        $this->assertFileExists($chromium);
        $this->assertIsolated('oday_relb1');

        config([
            'ninja.pdf_generator' => 'snappdf',
            'ninja.phantomjs_pdf_generation' => false,
            'ninja.invoiceninja_hosted_pdf_generation' => false,
            'ninja.snappdf_chromium_path' => $chromium,
        ]);

        $currencyId = (int) DB::table('currencies')->where('code', 'ILS')->value('id');
        $this->assertGreaterThan(0, $currencyId);

        $this->makeTestData();
        $settings = $this->company->settings;
        $settings->currency_id = (string) $currencyId;
        $settings->name = 'مكتب تجريبي';
        $settings->website = 'http://127.0.0.1';
        $this->company->settings = $settings;
        $this->company->save();
        $group = \App\Models\GroupSetting::query()->find($this->client->group_settings_id);
        if ($group) {
            $groupSettings = $group->settings;
            $groupSettings->website = 'http://127.0.0.1';
            $group->settings = $groupSettings;
            $group->save();
        }
        $this->client->name = 'عميل تجريبي';
        $clientSettings = $this->client->settings;
        $clientSettings->currency_id = (string) $currencyId;
        $this->client->settings = $clientSettings;
        $this->client->save();

        $invoice = $this->withHeaders($this->apiHeaders())->postJson('/api/v1/invoices?mark_sent=true', [
            'client_id' => $this->client->hashed_id,
            'public_notes' => 'فاتورة تجريبية',
            'line_items' => [[
                'quantity' => 1,
                'cost' => '1234.56',
                'product_key' => 'خدمات هندسية',
                'notes' => 'خدمات هندسية',
            ]],
        ]);
        $invoice->assertSuccessful();
        $invoiceId = $this->decodePrimaryKey($invoice->json('data.id'));
        $stored = (string) DB::table('invoices')->where('id', $invoiceId)->value('amount');
        $this->assertSame(0, bccomp($stored, '1234.56', 6));
        $ownerToken = $this->token;
        $invoiceHash = $invoice->json('data.id');

        putenv('HTTP_PROXY=http://127.0.0.1:9');
        putenv('HTTPS_PROXY=http://127.0.0.1:9');
        putenv('ALL_PROXY=http://127.0.0.1:9');
        putenv('NO_PROXY=127.0.0.1,localhost');

        $download = $this->withHeaders($this->apiHeaders())->post('/api/v1/invoices/bulk', [
            'action' => 'download',
            'ids' => [$invoiceHash],
        ]);

        putenv('HTTP_PROXY');
        putenv('HTTPS_PROXY');
        putenv('ALL_PROXY');
        putenv('NO_PROXY');

        $this->assertSame(200, $download->baseResponse->getStatusCode(), substr($download->getContent(), 0, 400));
        $bytes = $download->streamedContent();
        $this->assertStringStartsWith('%PDF', $bytes);
        $this->assertGreaterThan(12000, strlen($bytes));
        $this->assertStringContainsString('startxref', $bytes);
        $this->assertStringContainsString('%%EOF', $bytes);
        $this->assertStringNotContainsString('pdf.invoicing.co', $bytes);
        $header = $download->headers->get('content-type');
        $this->assertStringContainsString('application/pdf', (string) $header);
        file_put_contents(sys_get_temp_dir().DIRECTORY_SEPARATOR.'oday-relb1-invoice.pdf', $bytes);

        $row = Invoice::query()->findOrFail($invoiceId);
        $this->assertSame((int) $this->company->id, (int) $row->company_id);
        $this->assertSame(0, bccomp((string) $row->amount, '1234.56', 6));
        $this->assertSame('عميل تجريبي', (string) $row->client->name);

        $this->flushHeaders();
        auth()->logout();
        $anonymous = $this->postJson('/api/v1/invoices/bulk', [
            'action' => 'download',
            'ids' => [$invoiceHash],
        ]);
        $this->assertContains($anonymous->status(), [401, 403]);

        $this->makeTestData();
        $foreign = $this->withHeaders($this->apiHeaders())->post('/api/v1/invoices/bulk', [
            'action' => 'download',
            'ids' => [$invoiceHash],
        ]);
        $foreignBody = $foreign->getContent();
        $this->assertStringNotContainsString('%PDF', $foreignBody);
        $this->assertStringNotContainsString('1234.56', $foreignBody);

        $missing = $this->withHeaders([
            'X-API-SECRET' => config('ninja.api_secret'),
            'X-API-TOKEN' => $ownerToken,
        ])->postJson('/api/v1/invoices/bulk', [
            'action' => 'download',
            'ids' => [$this->encodePrimaryKey(99999999)],
        ]);
        $this->assertStringNotContainsString('%PDF', $missing->getContent());

        config(['ninja.snappdf_chromium_path' => 'C:\\oday-relb1-missing\\chrome.exe']);
        $producedPdf = false;
        $failureText = '';
        try {
            $bytes = Invoice::query()->findOrFail($invoiceId)->service()->getInvoicePdf();
            $producedPdf = is_string($bytes) && str_starts_with($bytes, '%PDF');
            $failureText = is_string($bytes) ? $bytes : '';
        } catch (\Throwable $exception) {
            $failureText = $exception->getMessage();
        }
        $this->assertFalse($producedPdf);
        $this->assertStringNotContainsString('%PDF', $failureText);
        $this->assertStringNotContainsString('DB_PASSWORD', $failureText);
        $this->assertStringNotContainsString('pdf.invoicing.co', $failureText);
        $this->assertStringContainsString('Unable to generate the raw PDF', $failureText);
    }

    private function assertIsolated(string $name): void
    {
        $this->assertSame('db-ninja-03', (string) config('database.default'));
        $connection = config('database.connections.db-ninja-03');
        $this->assertSame('127.0.0.1', (string) $connection['host']);
        $this->assertSame('3307', (string) $connection['port']);
        $this->assertSame($name, (string) $connection['database']);
        $this->assertSame($name, (string) DB::select('SELECT DATABASE() AS d')[0]->d);
    }

    private function apiHeaders(): array
    {
        return [
            'X-API-SECRET' => config('ninja.api_secret'),
            'X-API-TOKEN' => $this->token,
        ];
    }
}
