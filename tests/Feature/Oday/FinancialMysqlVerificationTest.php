<?php

namespace Tests\Feature\Oday;

use App\Models\Client;
use App\Models\Company;
use App\Models\CompanyUser;
use App\Models\Invoice;
use App\Models\OdayCheque;
use App\Models\Payment;
use App\Repositories\PaymentRepository;
use App\Services\Oday\Reports\OdayOfficeReportService;
use App\Utils\Traits\MakesHash;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use PDO;
use Tests\MockAccountData;
use Tests\TestCase;

class FinancialMysqlVerificationTest extends TestCase
{
    use DatabaseTransactions;
    use MakesHash;
    use MockAccountData;

    protected function setUp(): void
    {
        parent::setUp();

        $this->makeTestData();
    }

    public function test_clearing_persists_decimal_amounts_and_does_not_duplicate_payments(): void
    {
        foreach ([
            ['10.10', 'ILS', '10.10'],
            ['1234.56', 'USD', '1234.56'],
            ['1.234', 'JOD', '1.234'],
        ] as [$amount, $code, $expected]) {
            $currencyId = $this->useCurrency($code);
            $before = $this->paymentCount();
            $cheque = $this->clearIncomingCheque('CLR-'.$code.'-'.$amount, $amount, $code);
            $cheque->refresh();

            $this->assertSame(OdayCheque::STATUS_CLEARED, $cheque->status);
            $this->assertNotNull($cheque->payment_id);
            $this->assertSame($before + 1, $this->paymentCount());

            $row = DB::selectOne(
                'SELECT amount, currency_id, company_id, client_id, status_id FROM payments WHERE id = ?',
                [$cheque->payment_id]
            );
            $this->assertSame(0, bccomp((string) $row->amount, $expected, 6));
            $this->assertSame($currencyId, (int) $row->currency_id);
            $this->assertSame((int) $this->company->id, (int) $row->company_id);
            $this->assertSame((int) $this->client->id, (int) $row->client_id);

            $this->withHeaders($this->apiHeaders())->postJson("/api/v1/cheques/{$cheque->hashed_id}/transition", [
                'status' => OdayCheque::STATUS_CLEARED,
            ])->assertOk();

            $this->assertSame($before + 1, $this->paymentCount());
            $cheque->refresh();
            $this->assertSame(OdayCheque::STATUS_CLEARED, $cheque->status);
        }
    }

    public function test_failed_payment_save_does_not_leave_a_cleared_cheque_or_payment(): void
    {
        $this->useCurrency('ILS');
        $cheque = $this->createIncomingCheque('ROLLBACK-1', '10.10', 'ILS');
        $this->advanceTo($cheque, OdayCheque::STATUS_PROCESSING);
        $before = $this->paymentCount();

        $this->app->forgetInstance(PaymentRepository::class);
        $this->app->forgetInstance(\App\Services\Oday\OdayChequePaymentService::class);
        $this->app->forgetInstance(\App\Services\Oday\Cheque\OdayChequeService::class);
        $this->app->bind(PaymentRepository::class, PaymentRepositoryThatFails::class);

        try {
            $this->app->make(\App\Services\Oday\Cheque\OdayChequeService::class)->transition(
                $cheque->fresh(),
                $this->user,
                OdayCheque::STATUS_CLEARED,
                null,
            );
            $this->fail('Payment creation failure did not abort cheque clearing.');
        } catch (\RuntimeException $exception) {
            $this->assertSame('forced-payment-failure', $exception->getMessage());
        }

        $cheque->refresh();
        $this->assertSame(OdayCheque::STATUS_PROCESSING, $cheque->status);
        $this->assertNull($cheque->payment_id);
        $this->assertSame($before, $this->paymentCount());
    }

    public function test_second_connection_cannot_pass_the_cheque_row_lock(): void
    {
        $pdo = $this->secondConnection();
        $pdo->exec('SET FOREIGN_KEY_CHECKS=0');
        $dedupe = hash('sha256', 'lock-'.uniqid('', true));
        $pdo->prepare('INSERT INTO oday_cheques (company_id, user_id, client_id, number, direction, status, amount, amount_minor, currency_code, dedupe_key, is_deleted, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(6), NOW(6))')
            ->execute([
                $this->company->id,
                $this->user->id,
                $this->client->id,
                'LOCK-1',
                OdayCheque::DIRECTION_INCOMING,
                OdayCheque::STATUS_PROCESSING,
                '10.10',
                1010,
                'ILS',
                $dedupe,
            ]);
        $id = (int) $pdo->lastInsertId();

        DB::select('SELECT id FROM oday_cheques WHERE id = ? FOR UPDATE', [$id]);

        $other = $this->secondConnection();
        $other->exec('SET innodb_lock_wait_timeout = 1');
        $blocked = false;
        try {
            $other->beginTransaction();
            $other->query('SELECT id FROM oday_cheques WHERE id = '.$id.' FOR UPDATE');
            $other->rollBack();
        } catch (\PDOException $exception) {
            $blocked = str_contains($exception->getMessage(), 'Lock wait timeout');
        }

        $this->assertTrue($blocked, 'A second MySQL connection acquired the cheque row while it was locked.');
        $this->assertSame($id, (int) $pdo->query('SELECT id FROM oday_cheques WHERE id = '.$id)->fetchColumn());
    }

    public function test_office_summary_includes_every_eligible_row_and_keeps_currencies_apart(): void
    {
        $ils = (int) DB::table('currencies')->where('code', 'ILS')->value('id');
        $usd = (int) DB::table('currencies')->where('code', 'USD')->value('id');
        $rows = [];
        for ($i = 1; $i <= 1000; $i++) {
            $rows[] = $this->paymentRow($ils, '1.000000', '2026-03-15', Payment::STATUS_COMPLETED);
        }
        foreach (array_chunk($rows, 200) as $chunk) {
            DB::table('payments')->insert($chunk);
        }
        DB::table('payments')->insert($this->paymentRow($ils, '0.100000', '2026-03-31', Payment::STATUS_COMPLETED));
        DB::table('payments')->insert($this->paymentRow($ils, '500.000000', '2026-03-15', Payment::STATUS_CANCELLED));
        DB::table('payments')->insert($this->paymentRow($ils, '40.000000', '2026-03-15', Payment::STATUS_FAILED));
        DB::table('payments')->insert($this->paymentRow($ils, '8.000000', '2026-03-15', Payment::STATUS_REFUNDED, '3.000000'));
        DB::table('payments')->insert($this->paymentRow($ils, '70.000000', '2026-04-01', Payment::STATUS_COMPLETED));
        DB::table('payments')->insert($this->paymentRow($usd, '9.000000', '2026-03-15', Payment::STATUS_COMPLETED));
        $otherCompany = Company::factory()->create(['account_id' => $this->account->id]);
        $foreign = $this->paymentRow($ils, '999.000000', '2026-03-15', Payment::STATUS_COMPLETED);
        $foreign['company_id'] = $otherCompany->id;
        DB::table('payments')->insert($foreign);
        DB::table('payments')->insert($this->paymentRow($ils, '15.000000', '2026-03-02', Payment::STATUS_COMPLETED, '0', 1));

        $report = app(OdayOfficeReportService::class)->summarize((int) $this->company->id, 2026, 3);
        $independent = DB::selectOne(
            'SELECT SUM(amount - refunded) AS total FROM payments WHERE company_id = ? AND is_deleted = 0 AND deleted_at IS NULL AND status_id IN (1,4,5,6) AND currency_id = ? AND date BETWEEN ? AND ?',
            [$this->company->id, $ils, '2026-03-01', '2026-03-31']
        );

        $this->assertNull($report['income']);
        $this->assertStringContainsString('1005.10 ILS', (string) $report['incomeLabel']);
        $this->assertStringContainsString('9.00 USD', (string) $report['incomeLabel']);
        $this->assertStringNotContainsString('1014.10', (string) $report['incomeLabel']);
        $this->assertSame(0, bccomp((string) $independent->total, '1005.10', 6));
        $this->assertSame('0.00', app(OdayOfficeReportService::class)->summarize(999999, 2026, null)['income']);

        $this->withHeaders($this->apiHeaders())
            ->getJson('/api/v1/reports/office-summary?year=2026&month=3')
            ->assertOk()
            ->assertJsonPath('data.income', null);
    }

    public function test_open_receivables_are_not_summed_across_currencies(): void
    {
        $ils = (int) DB::table('currencies')->where('code', 'ILS')->value('id');
        $usd = (int) DB::table('currencies')->where('code', 'USD')->value('id');
        $this->useCurrency('ILS');
        $other = Client::factory()->create([
            'company_id' => $this->company->id,
            'user_id' => $this->user->id,
        ]);
        $this->setClientCurrency($other, $usd);
        $this->insertInvoice($this->client->id, '10.100000', Invoice::STATUS_SENT);
        $this->insertInvoice($other->id, '5.000000', Invoice::STATUS_SENT);
        $this->insertInvoice($this->client->id, '80.000000', Invoice::STATUS_CANCELLED);

        $report = app(OdayOfficeReportService::class)->summarize((int) $this->company->id, 2026, null);

        $this->assertNull($report['openReceivables']);
        $label = (string) $report['openReceivablesLabel'];
        $this->assertStringContainsString('ILS', $label);
        $this->assertStringContainsString('5.00 USD', $label);
        $this->assertStringNotContainsString('25.10', $label);
        $this->assertStringNotContainsString('80.00', $label);
        $this->assertGreaterThanOrEqual(2, $report['openInvoiceCount']);
    }

    public function test_invoice_and_expense_decimal_amounts_persist(): void
    {
        $this->useCurrency('ILS');
        $invoice = $this->withHeaders($this->apiHeaders())->postJson('/api/v1/invoices', [
            'client_id' => $this->client->hashed_id,
            'line_items' => [[
                'quantity' => 1,
                'cost' => '10.10',
                'notes' => 'phase2v',
            ]],
        ]);
        $invoice->assertSuccessful();
        $invoiceId = $this->decodePrimaryKey($invoice->json('data.id'));
        $stored = DB::table('invoices')->where('id', $invoiceId)->value('amount');
        $this->assertSame(0, bccomp((string) $stored, '10.10', 6));

        $zero = $this->withHeaders($this->apiHeaders())->postJson('/api/v1/invoices', [
            'client_id' => $this->client->hashed_id,
            'line_items' => [[
                'quantity' => 1,
                'cost' => '0',
                'notes' => 'zero',
            ]],
        ]);
        if ($zero->status() >= 400) {
            $zero->assertStatus(422);
        } else {
            $zero->assertSuccessful();
            $storedZero = DB::table('invoices')->where('id', $this->decodePrimaryKey($zero->json('data.id')))->value('amount');
            $this->assertSame(0, bccomp((string) $storedZero, '0', 6));
        }
        $negative = $this->withHeaders($this->apiHeaders())->postJson('/api/v1/expenses', [
            'amount' => '-5.00',
            'date' => Carbon::today()->toDateString(),
            'public_notes' => 'phase2v negative',
        ]);
        if ($negative->status() >= 400) {
            $negative->assertStatus(422);
        } else {
            $negative->assertSuccessful();
            $storedNegative = DB::table('expenses')->where('id', $this->decodePrimaryKey($negative->json('data.id')))->value('amount');
            $this->assertSame(0, bccomp((string) $storedNegative, '-5.00', 6));
        }

        $expense = $this->withHeaders($this->apiHeaders())->postJson('/api/v1/expenses', [
            'amount' => '1234.56',
            'date' => Carbon::today()->toDateString(),
            'public_notes' => 'phase2v expense',
        ]);
        $expense->assertSuccessful();
        $expenseId = $this->decodePrimaryKey($expense->json('data.id'));
        $expenseAmount = DB::table('expenses')->where('id', $expenseId)->value('amount');
        $this->assertSame(0, bccomp((string) $expenseAmount, '1234.56', 6));
        $this->assertSame((int) $this->company->id, (int) DB::table('expenses')->where('id', $expenseId)->value('company_id'));
    }

    public function test_payroll_expense_persists_the_decimal_amount_once(): void
    {
        $create = $this->withHeaders($this->apiHeaders())->postJson('/api/v1/employees', [
            'name' => 'تحقق مالي',
            'job_title' => 'محاسب',
            'salary' => '10.10',
            'currency' => 'ILS',
        ]);
        $create->assertCreated();
        $id = $create->json('data.id');
        $period = now()->format('Y-m');

        $pay = $this->withHeaders($this->apiHeaders())->postJson("/api/v1/employees/{$id}/pay", [
            'amount' => '10.10',
            'period' => $period,
            'paid_on' => now()->toDateString(),
            'method' => 'cash',
        ]);
        $pay->assertCreated();

        $employeeId = $this->decodePrimaryKey($id);
        $amount = DB::table('expenses')
            ->where('company_id', $this->company->id)
            ->where('number', 'PAY-'.$period.'-'.$employeeId)
            ->value('amount');
        $this->assertSame(0, bccomp((string) $amount, '10.10', 6));

        $this->withHeaders($this->apiHeaders())->postJson("/api/v1/employees/{$id}/pay", [
            'amount' => '10.10',
            'period' => $period,
            'paid_on' => now()->toDateString(),
            'method' => 'cash',
        ])->assertStatus(422);
        $this->assertSame(1, DB::table('expenses')->where('number', 'PAY-'.$period.'-'.$employeeId)->count());
    }

    public function test_repeated_paid_to_date_addition_stays_exact(): void
    {
        DB::table('clients')->where('id', $this->client->id)->update(['paid_to_date' => '0.000000']);
        $this->client->refresh();

        for ($i = 0; $i < 100; $i++) {
            $this->client->service()->updatePaidToDate('0.10');
        }

        $stored = DB::table('clients')->where('id', $this->client->id)->value('paid_to_date');
        $this->assertSame(0, bccomp((string) $stored, '10.00', 6), 'stored paid_to_date='.$stored);
    }

    public function test_financial_routes_enforce_authentication_and_permissions(): void
    {
        $this->getJson('/api/v1/reports/office-summary?year=2026')->assertStatus(403);
        $cheque = $this->createIncomingCheque('AUTH-1', '10.10', 'ILS');

        CompanyUser::query()
            ->where('user_id', $this->user->id)
            ->where('company_id', $this->company->id)
            ->update([
                'is_owner' => false,
                'is_admin' => false,
                'permissions' => '["view_client"]',
            ]);

        $this->withHeaders($this->apiHeaders())
            ->getJson('/api/v1/reports/office-summary?year=2026')
            ->assertStatus(403);

        $this->withHeaders($this->apiHeaders())->postJson("/api/v1/cheques/{$cheque->hashed_id}/transition", [
            'status' => OdayCheque::STATUS_DEPOSITED,
        ])->assertStatus(401);
        $cheque->refresh();
        $this->assertSame(OdayCheque::STATUS_RECEIVED, $cheque->status);
    }

    private function useCurrency(string $code): int
    {
        $id = (int) DB::table('currencies')->where('code', $code)->value('id');
        $this->assertGreaterThan(0, $id);
        $settings = $this->company->settings;
        $settings->currency_id = (string) $id;
        $this->company->settings = $settings;
        $this->company->save();
        $this->setClientCurrency($this->client, $id);

        return $id;
    }

    private function setClientCurrency(Client $client, int $currencyId): void
    {
        $settings = $client->settings;
        $settings->currency_id = (string) $currencyId;
        $client->settings = $settings;
        $client->save();
    }

    private function clearIncomingCheque(string $number, string $amount, string $currency): OdayCheque
    {
        $cheque = $this->createIncomingCheque($number, $amount, $currency);
        $this->advanceTo($cheque, OdayCheque::STATUS_PROCESSING);
        $this->withHeaders($this->apiHeaders())->postJson("/api/v1/cheques/{$cheque->hashed_id}/transition", [
            'status' => OdayCheque::STATUS_CLEARED,
        ])->assertOk();

        return $cheque->fresh();
    }

    private function createIncomingCheque(string $number, string $amount, string $currency): OdayCheque
    {
        $response = $this->withHeaders($this->apiHeaders())->postJson('/api/v1/cheques', [
            'direction' => 'incoming',
            'cheque_number' => $number,
            'amount' => $amount,
            'currency' => $currency,
            'client_id' => $this->client->hashed_id,
            'issue_date' => Carbon::today()->toDateString(),
            'due_date' => Carbon::today()->addMonth()->toDateString(),
        ]);
        $response->assertCreated();

        return OdayCheque::find($this->decodePrimaryKey($response->json('data.id')));
    }

    private function advanceTo(OdayCheque $cheque, string $status): void
    {
        $path = [
            OdayCheque::STATUS_DEPOSITED,
            OdayCheque::STATUS_PROCESSING,
            OdayCheque::STATUS_CLEARED,
        ];
        foreach ($path as $step) {
            $this->withHeaders($this->apiHeaders())->postJson("/api/v1/cheques/{$cheque->hashed_id}/transition", [
                'status' => $step,
            ])->assertOk();
            if ($step === $status) {
                return;
            }
        }
    }

    private function paymentCount(): int
    {
        return (int) DB::table('payments')->count();
    }

    /**
     * @return array<string, mixed>
     */
    private function paymentRow(int $currencyId, string $amount, string $date, int $status, string $refunded = '0', int $deleted = 0): array
    {
        return [
            'company_id' => $this->company->id,
            'client_id' => $this->client->id,
            'user_id' => $this->user->id,
            'status_id' => $status,
            'amount' => $amount,
            'refunded' => $refunded,
            'applied' => '0',
            'date' => $date,
            'is_deleted' => $deleted,
            'deleted_at' => $deleted ? now() : null,
            'exchange_rate' => '1',
            'currency_id' => $currencyId,
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }

    private function insertInvoice(int $clientId, string $balance, int $status): void
    {
        DB::table('invoices')->insert([
            'client_id' => $clientId,
            'user_id' => $this->user->id,
            'company_id' => $this->company->id,
            'status_id' => $status,
            'amount' => $balance,
            'balance' => $balance,
            'date' => '2026-06-01',
            'number' => 'P2V-'.uniqid(),
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * @return array<string, string>
     */
    private function apiHeaders(): array
    {
        return [
            'X-API-SECRET' => config('ninja.api_secret'),
            'X-API-TOKEN' => $this->token,
        ];
    }

    private function secondConnection(): PDO
    {
        return new PDO(
            'mysql:host=127.0.0.1;port=3307;dbname=oday_financial_verification;charset=utf8mb4',
            'oday_verify',
            (string) env('DB_PASSWORD'),
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
    }
}

class PaymentRepositoryThatFails extends PaymentRepository
{
    public function save(array $data, Payment $payment): ?Payment
    {
        parent::save($data, $payment);

        throw new \RuntimeException('forced-payment-failure');
    }
}
