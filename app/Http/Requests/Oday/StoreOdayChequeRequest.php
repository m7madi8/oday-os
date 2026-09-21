<?php

/**
 * نظام عدي أبو ضحى — طلبات إنشاء/تحديث الشيكات (الجوال).
 */

namespace App\Http\Requests\Oday;

use App\Http\Requests\Request;
use App\Models\OdayCheque;
use App\Services\Oday\OdayChequeMoney;
use App\Services\Oday\OdayChequeStatusService;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreOdayChequeRequest extends Request
{
    public function authorize(): bool
    {
        $user = auth()->user();

        return $user && ($user->isSuperUser() || $user->hasPermission('create_payment') || $user->hasPermission('edit_payment'));
    }

    public function rules(): array
    {
        return [
            'direction' => ['required', Rule::in([
                OdayCheque::DIRECTION_INCOMING,
                OdayCheque::DIRECTION_OUTGOING,
                'incoming',
                'outgoing',
                'in',
                'out',
            ])],
            'number' => ['required', 'string', 'max:64'],
            'bank_name' => ['nullable', 'string', 'max:120'],
            'bank_id' => ['nullable', 'string', 'max:64'],
            'amount' => ['required'],
            'currency_code' => ['nullable', Rule::in(OdayChequeMoney::allowedCurrencies())],
            'issue_date' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date'],
            'status' => $this->isMethod('post') ? ['prohibited'] : ['nullable', Rule::in(OdayCheque::statuses())],
            'status_reason' => ['nullable', 'string', 'max:5000'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'client_id' => ['nullable'],
            'vendor_id' => ['nullable'],
            'payee_name' => ['nullable', 'string', 'max:160'],
            'invoice_id' => ['nullable'],
            'project_id' => ['nullable'],
            'account_reference' => ['nullable', 'string', 'max:120'],
            'scan_document_id' => ['nullable'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if ($validator->errors()->isNotEmpty() || ! $this->has('amount')) {
                return;
            }

            $currency = strtoupper((string) $this->input('currency_code', OdayChequeMoney::CURRENCY_ILS));

            try {
                OdayChequeMoney::normalize((string) $this->input('amount'), $currency);
            } catch (\Illuminate\Validation\ValidationException $exception) {
                foreach ($exception->errors() as $field => $messages) {
                    foreach ($messages as $message) {
                        $validator->errors()->add($field, $message);
                    }
                }
            }
        });
    }

    public function prepareForValidation(): void
    {
        $input = $this->all();

        foreach (['client_id', 'invoice_id', 'vendor_id', 'project_id', 'scan_document_id'] as $field) {
            if (! array_key_exists($field, $input) || $input[$field] === '' || $input[$field] === null) {
                $input[$field] = null;
            }
        }

        if (isset($input['direction'])) {
            $input['direction'] = app(OdayChequeStatusService::class)->normalizeDirection((string) $input['direction']);
        }

        if (isset($input['currency_code']) && is_string($input['currency_code'])) {
            $input['currency_code'] = strtoupper(trim($input['currency_code']));
        }

        $this->replace($this->decodePrimaryKeys($input));
    }

    public function normalizedDirection(): string
    {
        return app(OdayChequeStatusService::class)->normalizeDirection((string) $this->input('direction', OdayCheque::DIRECTION_INCOMING));
    }

    public function normalizedAmount(): string
    {
        $currency = strtoupper((string) $this->input('currency_code', OdayChequeMoney::CURRENCY_ILS));

        return OdayChequeMoney::normalize((string) $this->input('amount'), $currency);
    }
}
