<?php

/**
 * نظام عدي أبو ضحى — طلبات إنشاء/تحديث الشيكات.
 */

namespace App\Http\Requests\Oday;

use App\Http\Requests\Request;
use App\Models\OdayCheque;
use Illuminate\Validation\Rule;

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
            'direction' => ['required', Rule::in([OdayCheque::DIRECTION_IN, OdayCheque::DIRECTION_OUT])],
            'number' => ['required', 'string', 'max:64'],
            'bank_name' => ['nullable', 'string', 'max:120'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'due_date' => ['nullable', 'date'],
            'status' => ['nullable', Rule::in(OdayCheque::statuses())],
            'notes' => ['nullable', 'string', 'max:5000'],
            'client_id' => ['nullable'],
            'invoice_id' => ['nullable'],
        ];
    }

    public function prepareForValidation(): void
    {
        $input = $this->all();

        foreach (['client_id', 'invoice_id'] as $field) {
            if (! array_key_exists($field, $input) || $input[$field] === '' || $input[$field] === null) {
                $input[$field] = null;
            }
        }

        $this->replace($this->decodePrimaryKeys($input));
    }
}
