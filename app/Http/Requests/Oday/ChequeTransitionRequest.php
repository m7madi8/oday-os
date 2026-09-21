<?php

namespace App\Http\Requests\Oday;

use App\Http\Requests\Request;
use App\Models\OdayCheque;
use Illuminate\Validation\Rule;

class ChequeTransitionRequest extends Request
{
    public function authorize(): bool
    {
        $user = auth()->user();

        return $user && ($user->isSuperUser() || $user->hasPermission('edit_payment') || $user->hasPermission('create_payment'));
    }

    public function rules(): array
    {
        return [
            'status' => ['required', Rule::in(OdayCheque::statuses())],
            'reason' => ['nullable', 'string', 'max:5000'],
        ];
    }
}
