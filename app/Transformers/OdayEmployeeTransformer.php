<?php

namespace App\Transformers;

use App\Models\OdayEmployee;
use App\Models\OdayPayrollPayment;
use App\Utils\Traits\MakesHash;

class OdayEmployeeTransformer
{
    use MakesHash;

    /**
     * @return array<string, mixed>
     */
    public function transform(OdayEmployee $employee, ?string $period = null, ?OdayPayrollPayment $periodPayment = null, ?OdayPayrollPayment $latestPayment = null): array
    {
        $period = $period ?: now()->format('Y-m');

        return [
            'id' => $employee->hashed_id,
            'name' => $employee->name,
            'job_title' => $employee->job_title ?: '',
            'phone' => $employee->phone ?: '',
            'salary' => round((float) $employee->salary_amount, 2),
            'currency' => strtoupper($employee->currency_code ?: 'ILS'),
            'hired_on' => $employee->hired_on ? substr((string) $employee->hired_on, 0, 10) : '',
            'notes' => $employee->notes ?: '',
            'is_active' => (bool) $employee->is_active,
            'period' => $period,
            'paid_this_period' => $periodPayment !== null,
            'period_payment' => $periodPayment ? $this->payment($periodPayment) : null,
            'last_payment' => $latestPayment ? $this->payment($latestPayment) : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function payment(OdayPayrollPayment $payment): array
    {
        return [
            'id' => $payment->hashed_id,
            'employee_id' => $payment->employee_id ? $this->encodePrimaryKey((int) $payment->employee_id) : '',
            'employee_name' => $payment->employee?->name ?: '',
            'amount' => round((float) $payment->amount, 2),
            'currency' => strtoupper($payment->currency_code ?: 'ILS'),
            'period' => $payment->period,
            'paid_on' => $payment->paid_on ? substr((string) $payment->paid_on, 0, 10) : '',
            'method' => $payment->method ?: OdayPayrollPayment::METHOD_CASH,
            'notes' => $payment->notes ?: '',
            'expense_id' => $payment->expense_id ? $this->encodePrimaryKey((int) $payment->expense_id) : '',
        ];
    }
}
