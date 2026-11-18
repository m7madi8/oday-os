<?php

namespace Tests\Feature\Oday;

use App\Models\Document;
use App\Models\OdayCheque;
use App\Services\Oday\Backup\BackupRestoreService;
use App\Services\Oday\Backup\BackupRestoreUnavailable;
use App\Utils\Traits\MakesHash;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Tests\MockAccountData;
use Tests\TestCase;

/**
 * Opt-in isolated recovery drill. Skipped unless ODAY_RELD1_PHASE is set.
 * Refuses every database except the two databases created for this drill.
 */
class RelD1RecoveryDrillTest extends TestCase
{
    use MakesHash;
    use MockAccountData;

    public function test_seed_representative_records(): void
    {
        if (getenv('ODAY_RELD1_PHASE') !== 'seed') {
            $this->markTestSkipped('seed phase only');
        }

        $this->assertIsolated('oday_reld1_source');
        $this->assertSame('local', config('filesystems.default'));
        $this->snapshotDashboard();

        $this->makeTestData();
        file_put_contents($this->temp('oday-reld1-company-key.txt'), $this->company->company_key);

        $settings = $this->company->settings;
        $settings->name = 'RELD1 Company';
        $settings->currency_id = '6';
        $this->company->settings = $settings;
        $this->company->save();
        $this->client->name = 'RELD1 Client';
        $clientSettings = $this->client->settings;
        $clientSettings->currency_id = '6';
        $this->client->settings = $clientSettings;
        $this->client->save();

        $project = $this->withHeaders($this->apiHeaders())->postJson('/api/v1/projects', [
            'name' => 'RELD1 Project',
            'client_id' => $this->client->hashed_id,
        ]);
        $project->assertSuccessful();
        $projectId = $this->decodePrimaryKey($project->json('data.id'));

        $invoice = $this->withHeaders($this->apiHeaders())->postJson('/api/v1/invoices?mark_sent=true', [
            'client_id' => $this->client->hashed_id,
            'project_id' => $project->json('data.id'),
            'line_items' => [[
                'quantity' => 1,
                'cost' => '1234.56',
                'notes' => 'RELD1 invoice',
            ]],
        ]);
        $invoice->assertSuccessful();
        $invoiceId = $this->decodePrimaryKey($invoice->json('data.id'));
        $storedInvoice = DB::table('invoices')->where('id', $invoiceId)->value('amount');
        $this->assertSame(0, bccomp((string) $storedInvoice, '1234.56', 6));

        $payment = $this->withHeaders($this->apiHeaders())->postJson('/api/v1/payments', [
            'client_id' => $this->client->hashed_id,
            'amount' => '100.00',
            'date' => '2026/11/18',
            'invoices' => [[
                'invoice_id' => $invoice->json('data.id'),
                'amount' => '100.00',
            ]],
        ]);
        $payment->assertSuccessful();
        $paymentId = $this->decodePrimaryKey($payment->json('data.id'));
        $storedPayment = DB::table('payments')->where('id', $paymentId)->value('amount');
        $this->assertSame(0, bccomp((string) $storedPayment, '100.00', 6));

        $cheque = $this->withHeaders($this->apiHeaders())->postJson('/api/v1/cheques', [
            'direction' => 'incoming',
            'cheque_number' => 'RELD1-100',
            'amount' => '1234.56',
            'currency' => 'ILS',
            'client_id' => $this->client->hashed_id,
            'issue_date' => '2026-11-01',
            'due_date' => '2026-12-01',
        ]);
        $cheque->assertCreated();
        $chequeId = $this->decodePrimaryKey($cheque->json('data.id'));

        $payload = "ODAY-REL-D1 attachment\n1234.56 ILS\n";
        $file = UploadedFile::fake()->createWithContent('reld1-note.txt', $payload);
        $upload = $this->withHeaders($this->apiHeaders())->post('/api/v1/invoices/'.$invoice->json('data.id').'/upload', [
            '_method' => 'PUT',
            'is_public' => false,
            'documents' => [$file],
        ]);
        $this->assertSame(200, $upload->status(), $upload->getContent());

        $document = Document::query()->where('documentable_id', $invoiceId)->orderByDesc('id')->first();
        $this->assertNotNull($document);
        $this->assertSame('local', $document->disk);
        $this->assertTrue($document->fileExists());
        $bytes = $document->getFile();
        $this->assertSame($payload, $bytes);

        $office = $this->withHeaders($this->apiHeaders())->putJson('/api/oday/mobile/office-settings', [
            'settings' => ['officeName' => 'RELD1 Office'],
        ]);
        $office->assertSuccessful();

        $readBack = $this->withHeaders($this->apiHeaders())->getJson('/api/v1/invoices/'.$invoice->json('data.id'));
        $readBack->assertSuccessful();
        $this->assertSame(0, bccomp((string) $readBack->json('data.amount'), '1234.56', 2));

        $manifest = [
            'company_id' => (int) $this->company->id,
            'company_key' => $this->company->company_key,
            'client_id' => (int) $this->client->id,
            'client_name' => 'RELD1 Client',
            'project_id' => (int) $projectId,
            'invoice_id' => (int) $invoiceId,
            'invoice_amount' => '1234.56',
            'invoice_balance' => (string) DB::table('invoices')->where('id', $invoiceId)->value('balance'),
            'payment_id' => (int) $paymentId,
            'payment_amount' => '100.00',
            'payment_currency_id' => (int) DB::table('payments')->where('id', $paymentId)->value('currency_id'),
            'cheque_id' => (int) $chequeId,
            'cheque_number' => 'RELD1-100',
            'cheque_amount' => '1234.56',
            'cheque_client_id' => (int) OdayCheque::query()->findOrFail($chequeId)->client_id,
            'document_id' => (int) $document->id,
            'document_url' => $document->url,
            'document_disk' => $document->disk,
            'document_size' => strlen($bytes),
            'document_sha256' => hash('sha256', $bytes),
            'currency_id' => 6,
            'migrations' => (int) DB::table('migrations')->count(),
            'tables' => (int) DB::select('SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = DATABASE()')[0]->c,
            'token' => $this->token,
        ];
        $manifest['invoice_currency_id'] = (int) DB::table('clients')->where('id', $this->client->id)->value('currency_id');
        file_put_contents($this->temp('oday-reld1-manifest.json'), json_encode($manifest, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        $this->assertSame(6, $manifest['invoice_currency_id']);
        $this->assertSame(6, $manifest['payment_currency_id']);
    }

    public function test_restored_application_reads_records(): void
    {
        if (getenv('ODAY_RELD1_PHASE') !== 'verify') {
            $this->markTestSkipped('verify phase only');
        }

        $this->assertIsolated('oday_reld1_target');
        $manifest = json_decode((string) file_get_contents($this->temp('oday-reld1-manifest.json')), true);
        $this->assertIsArray($manifest);
        $headers = [
            'X-API-SECRET' => config('ninja.api_secret'),
            'X-API-TOKEN' => $manifest['token'],
        ];

        $client = $this->withHeaders($headers)->getJson('/api/v1/clients/'.$this->encodePrimaryKey($manifest['client_id']));
        $client->assertSuccessful();
        $this->assertSame('RELD1 Client', $client->json('data.name'));

        $project = $this->withHeaders($headers)->getJson('/api/v1/projects/'.$this->encodePrimaryKey($manifest['project_id']));
        $project->assertSuccessful();
        $this->assertSame('RELD1 Project', $project->json('data.name'));
        $this->assertSame($this->encodePrimaryKey($manifest['client_id']), $project->json('data.client_id'));

        $invoice = $this->withHeaders($headers)->getJson('/api/v1/invoices/'.$this->encodePrimaryKey($manifest['invoice_id']));
        $invoice->assertSuccessful();
        $this->assertSame(0, bccomp((string) $invoice->json('data.amount'), '1234.56', 2));
        $this->assertSame($this->encodePrimaryKey($manifest['client_id']), $invoice->json('data.client_id'));

        $payment = $this->withHeaders($headers)->getJson('/api/v1/payments/'.$this->encodePrimaryKey($manifest['payment_id']));
        $payment->assertSuccessful();
        $this->assertSame(0, bccomp((string) $payment->json('data.amount'), '100.00', 2));

        $cheque = $this->withHeaders($headers)->getJson('/api/v1/cheques/'.$this->encodePrimaryKey($manifest['cheque_id']));
        $cheque->assertSuccessful();
        $this->assertSame('RELD1-100', $cheque->json('data.cheque_number'));
        $this->assertSame($manifest['client_id'], (int) DB::table('oday_cheques')->where('id', $manifest['cheque_id'])->value('client_id'));
        $this->assertSame(0, bccomp((string) DB::table('oday_cheques')->where('id', $manifest['cheque_id'])->value('amount'), '1234.56', 6));

        $download = $this->withHeaders($headers)->get('/api/v1/documents/'.$this->encodePrimaryKey($manifest['document_id']).'/download');
        $download->assertOk();
        $body = $download->streamedContent();
        $this->assertSame($manifest['document_sha256'], hash('sha256', $body));
        $this->assertSame($manifest['document_size'], strlen($body));

        $document = Document::query()->findOrFail($manifest['document_id']);
        $this->assertSame($manifest['company_id'], (int) $document->company_id);
        $this->assertSame($manifest['document_sha256'], hash('sha256', $document->getFile()));
        $this->assertSame($manifest['invoice_id'], (int) $document->documentable_id);

        $office = $this->withHeaders($headers)->getJson('/api/oday/mobile/office-settings');
        $office->assertSuccessful();
        $this->assertSame('RELD1 Office', $office->json('settings.officeName'));

        $this->assertSame(6, (int) DB::table('payments')->where('id', $manifest['payment_id'])->value('currency_id'));
        $this->assertSame(0, bccomp((string) DB::table('invoices')->where('id', $manifest['invoice_id'])->value('balance'), '1134.56', 2));
        $this->assertSame(0, bccomp((string) DB::table('invoices')->where('id', $manifest['invoice_id'])->value('amount'), '1234.56', 2));
        $this->assertSame($manifest['migrations'], (int) DB::table('migrations')->count());
        $this->assertSame(
            $manifest['tables'],
            (int) DB::select('SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = DATABASE()')[0]->c
        );

        auth()->logout();
        $denied = $this->flushHeaders()->getJson('/api/v1/invoices/'.$this->encodePrimaryKey($manifest['invoice_id']));
        $this->assertContains($denied->status(), [401, 403]);

        $restore = $this->withHeaders($headers)->postJson('/api/backup/restore', [
            'run_id' => 1,
            'confirm' => true,
        ]);
        $restore->assertStatus(409);
        $restore->assertJsonPath('code', 'restore_disabled');

        try {
            app(BackupRestoreService::class)->restoreFromRun((int) $manifest['company_id'], 1);
            $this->fail('restore service accepted a run');
        } catch (BackupRestoreUnavailable $exception) {
            $this->assertSame('restore_disabled', $exception->getMessage() === '' ? BackupRestoreUnavailable::CODE : BackupRestoreUnavailable::CODE);
        }
    }

    private function assertIsolated(string $name): void
    {
        $this->assertSame('db-ninja-03', (string) config('database.default'));
        $connection = config('database.connections.db-ninja-03');
        $this->assertSame('127.0.0.1', (string) $connection['host']);
        $this->assertSame('3307', (string) $connection['port']);
        $this->assertSame($name, (string) $connection['database']);
        $this->assertNotSame('ninja', $name);
        $this->assertSame($name, (string) DB::select('SELECT DATABASE() AS d')[0]->d);
    }

    private function apiHeaders(): array
    {
        return [
            'X-API-SECRET' => config('ninja.api_secret'),
            'X-API-TOKEN' => $this->token,
        ];
    }

    private function snapshotDashboard(): void
    {
        $path = storage_path('app/oday/dashboard.json');
        $existed = is_file($path);
        file_put_contents($this->temp('oday-reld1-dashboard-existed'), $existed ? '1' : '0');
        if ($existed) {
            copy($path, $this->temp('oday-reld1-dashboard-before.json'));
        }
    }

    private function temp(string $name): string
    {
        return sys_get_temp_dir().DIRECTORY_SEPARATOR.$name;
    }
}
