<?php

namespace App\Http\Requests\Oday;

use App\Http\Requests\Request;
use App\Services\Oday\OdayChequeMoney;
use Illuminate\Validation\Rule;

class EmployeeUpdateRequest extends Request
{
    public function authorize(): bool
    {
        $user = auth()->user();

        return $user && ($user->isSuperUser() || $user->hasPermission('edit_expense') || $user->hasPermission('create_expense'));
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:160'],
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
        if (array_key_exists('name', $input)) {
            $input['name'] = trim((string) $input['name']);
        }
        foreach (['job_title', 'phone', 'notes', 'hired_on'] as $field) {
            if (array_key_exists($field, $input) && (is_string($input[$field]) ? trim($input[$field]) === '' : $input[$field] === null)) {
                $input[$field] = null;
            }
        }
        if (array_key_exists('salary', $input) && ! array_key_exists('salary_amount', $input)) {
            $input['salary_amount'] = $input['salary'];
        }
        if (array_key_exists('currency', $input) || array_key_exists('currency_code', $input)) {
            $input['currency_code'] = strtoupper((string) ($input['currency'] ?? $input['currency_code'] ?? OdayChequeMoney::CURRENCY_ILS));
        }

        $this->replace($input);
    }

    /**
     * @return array<string, mixed>
     */
    public function validatedPayload(): array
    {
        $data = $this->validated();
        if (array_key_exists('salary', $data) || array_key_exists('salary_amount', $data)) {
            $data['salary_amount'] = (float) ($data['salary'] ?? $data['salary_amount'] ?? 0);
        }
        if (array_key_exists('currency', $data) || array_key_exists('currency_code', $data)) {
            $data['currency_code'] = strtoupper((string) ($data['currency'] ?? $data['currency_code'] ?? OdayChequeMoney::CURRENCY_ILS));
        }
        unset($data['salary'], $data['currency']);

        return $data;
    }
}
