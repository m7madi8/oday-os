<?php

namespace App\Http\Requests\Oday;

use App\Http\Requests\Request;
use App\Services\Oday\OdayChequeMoney;
use Illuminate\Validation\Rule;

class EmployeeStoreRequest extends Request
{
    public function authorize(): bool
    {
        $user = auth()->user();

        return $user && ($user->isSuperUser() || $user->hasPermission('create_expense') || $user->hasPermission('edit_expense'));
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:160'],
            'job_title' => ['nullable', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:40'],
            'salary' => ['nullable', 'numeric', 'min:0', 'max:999999999'],
            'salary_amount' => ['nullable', 'numeric', 'min:0', 'max:999999999'],
            'currency' => ['nullable', Rule::in(OdayChequeMoney::allowedCurrencies())],
            'currency_code' => ['nullable', Rule::in(OdayChequeMoney::allowedCurrencies())],
            'hired_on' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'اسم الموظف مطلوب',
        ];
    }

    public function prepareForValidation(): void
    {
        $input = $this->all();
        $input['name'] = trim((string) ($input['name'] ?? ''));
        $input['job_title'] = $this->blankToNull($input['job_title'] ?? null);
        $input['phone'] = $this->blankToNull($input['phone'] ?? null);
        $input['notes'] = $this->blankToNull($input['notes'] ?? null);
        $input['hired_on'] = $this->blankToNull($input['hired_on'] ?? null);
        $input['salary_amount'] = $input['salary'] ?? $input['salary_amount'] ?? 0;
        $input['currency_code'] = strtoupper((string) ($input['currency'] ?? $input['currency_code'] ?? OdayChequeMoney::CURRENCY_ILS));
        if (! array_key_exists('is_active', $input) || $input['is_active'] === null || $input['is_active'] === '') {
            $input['is_active'] = true;
        }

        $this->replace($input);
    }

    /**
     * @return array<string, mixed>
     */
    public function validatedPayload(): array
    {
        $data = $this->validated();
        $data['salary_amount'] = (float) ($data['salary'] ?? $data['salary_amount'] ?? 0);
        $data['currency_code'] = strtoupper((string) ($data['currency'] ?? $data['currency_code'] ?? OdayChequeMoney::CURRENCY_ILS));
        unset($data['salary'], $data['currency']);

        return $data;
    }

    private function blankToNull(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $trimmed = trim((string) $value);

        return $trimmed === '' ? null : $trimmed;
    }
}
