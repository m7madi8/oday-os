<?php

namespace Tests\Feature\Oday;

use App\Models\OdayEmployee;
use App\Utils\Traits\MakesHash;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\MockAccountData;
use Tests\TestCase;

class PayrollApiTest extends TestCase
{
    use DatabaseTransactions;
    use MakesHash;
    use MockAccountData;

    protected function setUp(): void
    {
        parent::setUp();
        $this->makeTestData();
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

    public function test_create_employee_and_pay_salary(): void
    {
        $create = $this->withHeaders($this->apiHeaders())->postJson('/api/v1/employees', [
            'name' => 'سارة خالد',
            'job_title' => 'محاسب',
            'salary' => '2500.00',
            'currency' => 'ILS',
            'phone' => '0599000000',
        ]);

        $create->assertCreated();
        $this->assertSame('سارة خالد', $create->json('data.name'));
        $this->assertEquals(2500, $create->json('data.salary'));

        $id = $create->json('data.id');
        $period = now()->format('Y-m');

        $pay = $this->withHeaders($this->apiHeaders())->postJson("/api/v1/employees/{$id}/pay", [
            'amount' => '2500.00',
            'period' => $period,
            'paid_on' => now()->toDateString(),
            'method' => 'cash',
        ]);

        $pay->assertCreated();
        $this->assertEquals(2500, $pay->json('data.amount'));
        $this->assertSame($period, $pay->json('data.period'));

        $employee = OdayEmployee::find($this->decodePrimaryKey($id));
        $this->assertNotNull($employee);
        $this->assertDatabaseHas('oday_payroll_payments', [
            'employee_id' => $employee->id,
            'period' => $period,
        ]);
        $this->assertDatabaseHas('expenses', [
            'company_id' => $this->company->id,
            'public_notes' => 'راتب سارة خالد — '.$this->periodLabel($period),
        ]);

        $again = $this->withHeaders($this->apiHeaders())->postJson("/api/v1/employees/{$id}/pay", [
            'amount' => '2500.00',
            'period' => $period,
            'paid_on' => now()->toDateString(),
            'method' => 'cash',
        ]);
        $again->assertStatus(422);
    }

    public function test_employee_name_required(): void
    {
        $this->withHeaders($this->apiHeaders())->postJson('/api/v1/employees', [
            'salary' => '100',
        ])->assertStatus(422);
    }

    public function test_list_includes_unpaid_status(): void
    {
        $employee = new OdayEmployee();
        $employee->company_id = $this->company->id;
        $employee->user_id = $this->user->id;
        $employee->name = 'أحمد';
        $employee->salary_amount = 1800;
        $employee->currency_code = 'ILS';
        $employee->is_active = true;
        $employee->is_deleted = false;
        $employee->save();

        $response = $this->withHeaders($this->apiHeaders())->getJson('/api/v1/employees');
        $response->assertOk();
        $row = collect($response->json('data'))->firstWhere('name', 'أحمد');
        $this->assertNotNull($row);
        $this->assertFalse($row['paid_this_period']);
        $this->assertSame(1, $response->json('meta.summary.unpaid_count'));
    }

    private function periodLabel(string $period): string
    {
        $months = [
            1 => 'يناير', 2 => 'فبراير', 3 => 'مارس', 4 => 'أبريل', 5 => 'مايو', 6 => 'يونيو',
            7 => 'يوليو', 8 => 'أغسطس', 9 => 'سبتمبر', 10 => 'أكتوبر', 11 => 'نوفمبر', 12 => 'ديسمبر',
        ];
        [$year, $month] = array_map('intval', explode('-', $period));

        return ($months[$month] ?? $period).' '.$year;
    }
}
