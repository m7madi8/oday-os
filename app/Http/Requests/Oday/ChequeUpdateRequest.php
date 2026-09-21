<?php

namespace App\Http\Requests\Oday;

class ChequeUpdateRequest extends ChequeStoreRequest
{
    public function rules(): array
    {
        $rules = parent::rules();
        $rules['direction'][0] = 'sometimes';
        $rules['cheque_number'][0] = 'sometimes';
        $rules['number'][0] = 'sometimes';
        $rules['amount'][0] = 'sometimes';

        return $rules;
    }
}
