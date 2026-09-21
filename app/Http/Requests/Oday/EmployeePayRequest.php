<?php

namespace App\Http\Requests\Oday;

use App\Http\Requests\Request;
use App\Models\OdayPayrollPayment;
use Illuminate\Validation\Rule;

class EmployeePayRequest extends Request
{
    public function authorize(): bool
    {
        $user = auth()->user();

        return $user && ($user->isSuperUser() || $user->hasPermission('create_expense') || $user->hasPermission('edit_expense'));
    }

    public function rules(): array
    {
        return [
            'amount' => ['required'],
            'period' => ['required', 'regex:/^\d{4}-(0[1-9]|1[0-2])$/'],
            'paid_on' => ['required', 'date'],
            'method' => ['nullable', Rule::in(OdayPayrollPayment::methods())],
            'notes' => ['nullable', 'string', 'max:5000'],
        ];
    }

    public function messages(): array
    {
        return [
            'amount.required' => 'مبلغ الراتب مطلوب',
            'period.required' => 'حدد شهر الراتب',
            'period.regex' => 'صيغة الشهر غير صالحة',
            'paid_on.required' => 'تاريخ الصرف مطلوب',
        ];
    }

    public function prepareForValidation(): void
    {
        $input = $this->all();
        $input['method'] = $input['method'] ?? OdayPayrollPayment::METHOD_CASH;
        $input['notes'] = isset($input['notes']) && trim((string) $input['notes']) !== ''
            ? trim((string) $input['notes'])
            : null;

        $this->replace($input);
    }

    /**
     * @return array<string, mixed>
     */
    public function validatedPayload(): array
    {
        return $this->validated();
    }
}
