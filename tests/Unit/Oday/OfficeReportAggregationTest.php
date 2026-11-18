<?php

namespace Tests\Unit\Oday;

use App\Services\Oday\Reports\OdayOfficeReportService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class OfficeReportAggregationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (! extension_loaded('pdo_sqlite')) {
            $this->markTestSkipped('pdo_sqlite is not installed. SQL report aggregation was not executed.');
        }

        config()->set('database.connections.sqlite.database', ':memory:');
        config()->set('database.default', 'sqlite');
        DB::purge('sqlite');
        DB::setDefaultConnection('sqlite');

        $this->assertSame('sqlite', DB::getDefaultConnection());
        $this->migrate();
    }

    public function test_sums_more_than_one_thousand_payments_for_one_company_and_currency(): void
    {
        DB::table('currencies')->insert(['id' => 1, 'code' => 'ILS']);

        $rows = [];
        for ($i = 1; $i <= 1000; $i++) {
            $rows[] = $this->payment($i, 1, '1.00', 1, '2026-03-01');
        }
        foreach (array_chunk($rows, 200) as $chunk) {
            DB::table('payments')->insert($chunk);
        }
        DB::table('payments')->insert($this->payment(1001, 1, '0.10', 1, '2026-03-02'));
        DB::table('payments')->insert($this->payment(1002, 2, '999.00', 1, '2026-03-02'));
        DB::table('payments')->insert($this->payment(1003, 1, '50.00', 1, '2026-03-03', 1));

        $report = app(OdayOfficeReportService::class)->summarize(1, 2026, null);

        $this->assertFalse($report['mixed']);
        $this->assertSame('1000.10', $report['income']);
        $this->assertNull($report['incomeLabel']);
        $this->assertSame('ILS', $report['currencyCode']);
    }

    public function test_does_not_add_different_currencies_into_one_total(): void
    {
        DB::table('currencies')->insert([
            ['id' => 1, 'code' => 'ILS'],
            ['id' => 2, 'code' => 'USD'],
        ]);
        DB::table('payments')->insert($this->payment(1, 1, '10.10', 1, '2026-04-01'));
        DB::table('payments')->insert($this->payment(2, 1, '5.00', 2, '2026-04-02'));

        $report = app(OdayOfficeReportService::class)->summarize(1, 2026, null);

        $this->assertNull($report['income']);
        $this->assertStringContainsString('10.10 ILS', (string) $report['incomeLabel']);
        $this->assertStringContainsString('5.00 USD', (string) $report['incomeLabel']);
        $this->assertStringNotContainsString('15.10', (string) $report['incomeLabel']);
    }

    public function test_month_filter_open_invoices_and_deleted_records(): void
    {
        DB::table('currencies')->insert(['id' => 1, 'code' => 'ILS']);
        DB::table('clients')->insert([
            ['id' => 5, 'name' => 'مكتب النور'],
        ]);
        DB::table('payments')->insert($this->payment(1, 1, '10.00', 1, '2026-01-15'));
        DB::table('payments')->insert($this->payment(2, 1, '3.50', 1, '2026-06-15'));
        DB::table('expenses')->insert([
            'id' => 1,
            'company_id' => 1,
            'is_deleted' => 0,
            'deleted_at' => null,
            'amount' => '1.25',
            'currency_id' => 1,
            'date' => '2026-06-20',
            'payment_date' => null,
            'project_id' => null,
        ]);
        DB::table('invoices')->insert([
            [
                'id' => 1,
                'company_id' => 1,
                'client_id' => 5,
                'status_id' => 2,
                'is_deleted' => 0,
                'deleted_at' => null,
                'balance' => '10.10',
                'number' => 'INV-1',
                'date' => '2026-06-01',
                'due_date' => '2026-07-01',
            ],
            [
                'id' => 2,
                'company_id' => 1,
                'client_id' => 5,
                'status_id' => 5,
                'is_deleted' => 0,
                'deleted_at' => null,
                'balance' => '80.00',
                'number' => 'INV-CANCEL',
                'date' => '2026-06-01',
                'due_date' => '2026-07-01',
            ],
            [
                'id' => 3,
                'company_id' => 1,
                'client_id' => 5,
                'status_id' => 2,
                'is_deleted' => 1,
                'deleted_at' => '2026-06-02 00:00:00',
                'balance' => '40.00',
                'number' => 'INV-DEL',
                'date' => '2026-06-01',
                'due_date' => '2026-07-01',
            ],
        ]);

        $report = app(OdayOfficeReportService::class)->summarize(1, 2026, 6);

        $this->assertSame('3.50', $report['income']);
        $this->assertSame('1.25', $report['expenses']);
        $this->assertSame('2.25', $report['netProfit']);
        $this->assertSame('10.10', $report['openReceivables']);
        $this->assertSame(1, $report['openInvoiceCount']);
        $this->assertSame('INV-1', $report['openInvoices'][0]['number']);
        $this->assertSame(2, $report['yearInvoiceCount']);
    }

    public function test_empty_company_returns_zero_without_mixing(): void
    {
        $report = app(OdayOfficeReportService::class)->summarize(9, 2026, null);

        $this->assertSame('0.00', $report['income']);
        $this->assertSame('0.00', $report['expenses']);
        $this->assertSame('0.00', $report['netProfit']);
        $this->assertFalse($report['mixed']);
        $this->assertSame(0, $report['openInvoiceCount']);
        $this->assertCount(12, $report['monthlySeries']);
    }

    private function migrate(): void
    {
        Schema::create('currencies', function (Blueprint $table) {
            $table->unsignedInteger('id')->primary();
            $table->string('code');
        });
        Schema::create('clients', function (Blueprint $table) {
            $table->unsignedInteger('id')->primary();
            $table->string('name');
        });
        Schema::create('payments', function (Blueprint $table) {
            $table->unsignedInteger('id')->primary();
            $table->unsignedInteger('company_id');
            $table->unsignedInteger('client_id')->nullable();
            $table->unsignedInteger('project_id')->nullable();
            $table->unsignedInteger('currency_id')->nullable();
            $table->decimal('amount', 20, 6);
            $table->date('date')->nullable();
            $table->boolean('is_deleted')->default(false);
            $table->timestamp('deleted_at')->nullable();
        });
        Schema::create('expenses', function (Blueprint $table) {
            $table->unsignedInteger('id')->primary();
            $table->unsignedInteger('company_id');
            $table->unsignedInteger('project_id')->nullable();
            $table->unsignedInteger('currency_id')->nullable();
            $table->decimal('amount', 20, 6);
            $table->date('date')->nullable();
            $table->date('payment_date')->nullable();
            $table->boolean('is_deleted')->default(false);
            $table->timestamp('deleted_at')->nullable();
        });
        Schema::create('invoices', function (Blueprint $table) {
            $table->unsignedInteger('id')->primary();
            $table->unsignedInteger('company_id');
            $table->unsignedInteger('client_id')->nullable();
            $table->unsignedInteger('status_id');
            $table->decimal('balance', 20, 6)->default(0);
            $table->string('number')->nullable();
            $table->date('date')->nullable();
            $table->dateTime('due_date')->nullable();
            $table->boolean('is_deleted')->default(false);
            $table->timestamp('deleted_at')->nullable();
        });
        Schema::create('projects', function (Blueprint $table) {
            $table->unsignedInteger('id')->primary();
            $table->unsignedInteger('company_id');
            $table->unsignedInteger('client_id')->nullable();
            $table->string('name')->nullable();
            $table->string('custom_value1')->nullable();
            $table->boolean('is_deleted')->default(false);
            $table->timestamp('deleted_at')->nullable();
            $table->timestamp('created_at')->nullable();
        });
    }

    /**
     * @return array<string, mixed>
     */
    private function payment(int $id, int $companyId, string $amount, int $currencyId, string $date, int $deleted = 0): array
    {
        return [
            'id' => $id,
            'company_id' => $companyId,
            'client_id' => 5,
            'project_id' => null,
            'currency_id' => $currencyId,
            'amount' => $amount,
            'date' => $date,
            'is_deleted' => $deleted,
            'deleted_at' => $deleted ? '2026-03-04 00:00:00' : null,
        ];
    }
}
