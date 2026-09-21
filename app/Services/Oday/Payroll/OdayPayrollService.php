<?php

namespace App\Services\Oday\Payroll;

use App\Events\Expense\ExpenseWasCreated;
use App\Factory\ExpenseCategoryFactory;
use App\Factory\ExpenseFactory;
use App\Models\Currency;
use App\Models\ExpenseCategory;
use App\Models\OdayEmployee;
use App\Models\OdayPayrollPayment;
use App\Models\User;
use App\Repositories\ExpenseRepository;
use App\Services\Oday\OdayChequeMoney;
use App\Utils\Ninja;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OdayPayrollService
{
    private const MONTHS_AR = [
        1 => 'يناير',
        2 => 'فبراير',
        3 => 'مارس',
        4 => 'أبريل',
        5 => 'مايو',
        6 => 'يونيو',
        7 => 'يوليو',
        8 => 'أغسطس',
        9 => 'سبتمبر',
        10 => 'أكتوبر',
        11 => 'نوفمبر',
        12 => 'ديسمبر',
    ];

    public function __construct(private ExpenseRepository $expenses)
    {
    }

    /**
     * @param array<string, mixed> $filters
     */
    public function listEmployees(User $user, array $filters): LengthAwarePaginator
    {
        $period = $this->normalizePeriod($filters['period'] ?? null);
        $perPage = min(max((int) ($filters['per_page'] ?? 50), 1), 100);

        $query = OdayEmployee::query()
            ->where('company_id', $user->companyId())
            ->where('is_deleted', false);

        $active = $filters['active'] ?? null;
        if ($active === '1' || $active === 1 || $active === true) {
            $query->where('is_active', true);
        } elseif ($active === '0' || $active === 0) {
            $query->where('is_active', false);
        }

        $search = trim((string) ($filters['filter'] ?? ''));
        if ($search !== '') {
            $query->where(function ($inner) use ($search) {
                $like = '%'.$search.'%';
                $inner->where('name', 'like', $like)
                    ->orWhere('job_title', 'like', $like)
                    ->orWhere('phone', 'like', $like);
            });
        }

        $paginator = $query->orderBy('name')->paginate($perPage);
        $this->attachPayments($paginator->getCollection(), $period);

        return $paginator;
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function create(User $user, array $payload): OdayEmployee
    {
        $employee = new OdayEmployee();
        $employee->company_id = $user->companyId();
        $employee->user_id = $user->id;
        $employee->fill($this->employeeAttributes($payload));
        $employee->is_deleted = false;
        $employee->save();

        return $employee->fresh();
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function update(OdayEmployee $employee, array $payload): OdayEmployee
    {
        $employee->fill($this->employeeAttributes($payload));
        $employee->save();

        return $employee->fresh();
    }

    public function softDelete(OdayEmployee $employee): void
    {
        $employee->is_deleted = true;
        $employee->is_active = false;
        $employee->save();
        $employee->delete();
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function pay(OdayEmployee $employee, User $user, array $payload): OdayPayrollPayment
    {
        if ($employee->is_deleted) {
            throw ValidationException::withMessages([
                'employee' => ['لا يمكن صرف راتب لموظف محذوف'],
            ]);
        }

        $period = $this->normalizePeriod($payload['period'] ?? null);
        $existing = OdayPayrollPayment::query()
            ->where('company_id', $employee->company_id)
            ->where('employee_id', $employee->id)
            ->where('period', $period)
            ->where('is_deleted', false)
            ->first();

        if ($existing) {
            throw ValidationException::withMessages([
                'period' => ['تم صرف راتب هذا الشهر لهذا الموظف مسبقاً'],
            ]);
        }

        $currency = strtoupper($employee->currency_code ?: OdayChequeMoney::CURRENCY_ILS);
        $amount = OdayChequeMoney::normalize((string) $payload['amount'], $currency);
        $paidOn = (string) $payload['paid_on'];
        $method = (string) ($payload['method'] ?? OdayPayrollPayment::METHOD_CASH);
        $notes = $payload['notes'] ?? null;

        return DB::transaction(function () use ($employee, $user, $amount, $currency, $period, $paidOn, $method, $notes) {
            $expense = $this->recordSalaryExpense($employee, $user, $amount, $currency, $period, $paidOn, $notes);

            $payment = new OdayPayrollPayment();
            $payment->company_id = $employee->company_id;
            $payment->user_id = $user->id;
            $payment->employee_id = $employee->id;
            $payment->expense_id = $expense->id;
            $payment->amount = $amount;
            $payment->currency_code = $currency;
            $payment->period = $period;
            $payment->paid_on = $paidOn;
            $payment->method = $method;
            $payment->notes = $notes;
            $payment->is_deleted = false;
            $payment->save();

            return $payment->load('employee');
        });
    }

    /**
     * @param array<string, mixed> $filters
     */
    public function listPayments(User $user, array $filters): LengthAwarePaginator
    {
        $query = OdayPayrollPayment::query()
            ->with('employee')
            ->where('company_id', $user->companyId())
            ->where('is_deleted', false)
            ->whereHas('employee', function ($employeeQuery) {
                $employeeQuery->where('is_deleted', false);
            });

        if (! empty($filters['period'])) {
            $query->where('period', $this->normalizePeriod($filters['period']));
        }

        $perPage = min(max((int) ($filters['per_page'] ?? 50), 1), 100);

        return $query->orderByDesc('paid_on')->orderByDesc('id')->paginate($perPage);
    }

    /**
     * @return array<string, mixed>
     */
    public function summary(User $user, ?string $period): array
    {
        $period = $this->normalizePeriod($period);

        $employees = OdayEmployee::query()
            ->where('company_id', $user->companyId())
            ->where('is_deleted', false)
            ->where('is_active', true)
            ->get();

        $payments = OdayPayrollPayment::query()
            ->where('company_id', $user->companyId())
            ->where('is_deleted', false)
            ->where('period', $period)
            ->get()
            ->keyBy('employee_id');

        $salaryTotal = 0.0;
        $paidTotal = 0.0;
        $unpaidTotal = 0.0;
        $paidCount = 0;

        foreach ($employees as $employee) {
            $salary = (float) $employee->salary_amount;
            $salaryTotal += $salary;
            $payment = $payments->get($employee->id);
            if ($payment) {
                $paidCount++;
                $paidTotal += (float) $payment->amount;
            } else {
                $unpaidTotal += $salary;
            }
        }

        $count = $employees->count();

        return [
            'period' => $period,
            'period_label' => $this->periodLabel($period),
            'employee_count' => $count,
            'paid_count' => $paidCount,
            'unpaid_count' => $count - $paidCount,
            'salary_total' => round($salaryTotal, 2),
            'paid_total' => round($paidTotal, 2),
            'unpaid_total' => round($unpaidTotal, 2),
        ];
    }

    public function normalizePeriod(mixed $period): string
    {
        $value = is_string($period) ? trim($period) : '';
        if (preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $value)) {
            return $value;
        }

        return now()->format('Y-m');
    }

    public function periodLabel(string $period): string
    {
        [$year, $month] = array_map('intval', explode('-', $period));
        $name = self::MONTHS_AR[$month] ?? $period;

        return $name.' '.$year;
    }

    /**
     * @param \Illuminate\Support\Collection<int, OdayEmployee> $employees
     */
    public function attachPayments($employees, string $period): void
    {
        $ids = $employees->pluck('id')->filter()->all();
        if ($ids === []) {
            return;
        }

        $periodPayments = OdayPayrollPayment::query()
            ->whereIn('employee_id', $ids)
            ->where('period', $period)
            ->where('is_deleted', false)
            ->get()
            ->keyBy('employee_id');

        $latestPayments = OdayPayrollPayment::query()
            ->whereIn('employee_id', $ids)
            ->where('is_deleted', false)
            ->orderByDesc('paid_on')
            ->orderByDesc('id')
            ->get()
            ->unique('employee_id')
            ->keyBy('employee_id');

        foreach ($employees as $employee) {
            $employee->setAttribute('period_payment', $periodPayments->get($employee->id));
            $employee->setAttribute('latest_payment', $latestPayments->get($employee->id));
        }
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function employeeAttributes(array $payload): array
    {
        $attrs = [];
        foreach (['name', 'job_title', 'phone', 'hired_on', 'notes', 'is_active'] as $field) {
            if (array_key_exists($field, $payload)) {
                $attrs[$field] = $payload[$field];
            }
        }
        if (array_key_exists('salary_amount', $payload)) {
            $attrs['salary_amount'] = (float) $payload['salary_amount'];
        }
        if (array_key_exists('currency_code', $payload)) {
            $attrs['currency_code'] = strtoupper((string) $payload['currency_code']);
        }

        return $attrs;
    }

    private function recordSalaryExpense(
        OdayEmployee $employee,
        User $user,
        string $amount,
        string $currency,
        string $period,
        string $paidOn,
        ?string $notes,
    ) {
        $company = $user->company();
        $category = $this->salaryCategory($user);
        $label = 'راتب '.$employee->name.' — '.$this->periodLabel($period);

        $expense = ExpenseFactory::create((int) $company->id, (int) $user->id);
        $expense->setRelation('company', $company);

        $saved = $this->expenses->save([
            'amount' => (float) $amount,
            'date' => $paidOn,
            'payment_date' => $paidOn,
            'public_notes' => $label,
            'private_notes' => $notes ?: '',
            'category_id' => $category->id,
            'currency_id' => $this->currencyId($currency, $company),
            'exchange_rate' => 1,
            'should_be_invoiced' => false,
            'number' => $this->payrollExpenseNumber($employee, $period),
        ], $expense);

        event(new ExpenseWasCreated($saved, $saved->company()->first() ?: $company, Ninja::eventVars($user->id)));

        return $saved;
    }

    private function payrollExpenseNumber(OdayEmployee $employee, string $period): string
    {
        return 'PAY-'.$period.'-'.$employee->id;
    }

    private function salaryCategory(User $user): ExpenseCategory
    {
        $companyId = $user->companyId();
        $existing = ExpenseCategory::query()
            ->where('company_id', $companyId)
            ->where('is_deleted', false)
            ->where('name', 'رواتب')
            ->first();

        if ($existing) {
            return $existing;
        }

        $category = ExpenseCategoryFactory::create($companyId, (int) $user->id);
        $category->name = 'رواتب';
        $category->color = '#5C6570';
        $category->save();

        return $category;
    }

    private function currencyId(string $code, $company): int
    {
        $id = Currency::query()->where('code', strtoupper($code))->value('id');
        if ($id) {
            return (int) $id;
        }

        return (int) ($company->settings->currency_id ?? 6);
    }
}
