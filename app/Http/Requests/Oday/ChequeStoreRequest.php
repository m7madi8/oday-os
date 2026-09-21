<?php

namespace App\Http\Requests\Oday;

use App\Http\Requests\Request;
use App\Models\OdayCheque;
use App\Services\Oday\OdayChequeMoney;
use App\Services\Oday\OdayChequeStatusService;
use Illuminate\Validation\Rule;

class ChequeStoreRequest extends Request
{
    public function authorize(): bool
    {
        $user = auth()->user();

        return $user && ($user->isSuperUser() || $user->hasPermission('create_payment') || $user->hasPermission('edit_payment'));
    }

    public function rules(): array
    {
        return [
            'direction' => ['required', Rule::in(['incoming', 'outgoing', 'in', 'out'])],
            'cheque_number' => ['required_without:number', 'string', 'max:64'],
            'number' => ['required_without:cheque_number', 'string', 'max:64'],
            'amount' => ['required'],
            'currency' => ['nullable', Rule::in(OdayChequeMoney::allowedCurrencies())],
            'currency_code' => ['nullable', Rule::in(OdayChequeMoney::allowedCurrencies())],
            'issue_date' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date'],
            'bank_id' => ['nullable', 'string', 'max:64'],
            'bank_name' => ['nullable', 'string', 'max:120'],
            'client_id' => ['nullable'],
            'vendor_id' => ['nullable'],
            'payee_name' => ['nullable', 'string', 'max:160'],
            'drawer_name' => ['nullable', 'string', 'max:160'],
            'account_reference' => ['nullable', 'string', 'max:120'],
            'project_id' => ['nullable'],
            'invoice_id' => ['nullable'],
            'scan_document_id' => ['nullable'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ];
    }

    public function prepareForValidation(): void
    {
        $input = $this->all();
        $input['number'] = $input['cheque_number'] ?? $input['number'] ?? null;
        $input['currency_code'] = strtoupper((string) ($input['currency'] ?? $input['currency_code'] ?? OdayChequeMoney::CURRENCY_ILS));

        foreach (['client_id', 'vendor_id', 'project_id', 'invoice_id', 'scan_document_id'] as $field) {
            if (! array_key_exists($field, $input) || $input[$field] === '' || $input[$field] === null) {
                $input[$field] = null;
            }
        }

        $input['direction'] = app(OdayChequeStatusService::class)->normalizeDirection((string) ($input['direction'] ?? OdayCheque::DIRECTION_INCOMING));

        $this->replace($this->decodePrimaryKeys($input));
    }

    /**
     * @return array<string, mixed>
     */
    public function validatedPayload(): array
    {
        return $this->validated();
    }
}
