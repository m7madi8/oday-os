<?php

/**
 * نظام عدي أبو ضحى — إنشاء دفعة Invoice Ninja عند صرف شيك وارد.
 */

namespace App\Services\Oday;

use App\Factory\PaymentFactory;
use App\Models\OdayCheque;
use App\Models\PaymentType;
use App\Models\User;
use App\Repositories\PaymentRepository;
use Illuminate\Support\Carbon;

class OdayChequePaymentService
{
    public function __construct(private PaymentRepository $payments)
    {
    }

    public function clear(OdayCheque $cheque, User $user): OdayCheque
    {
        if ($cheque->status === OdayCheque::STATUS_CLEARED && $cheque->payment_id) {
            return $cheque;
        }

        if (in_array($cheque->direction, [OdayCheque::DIRECTION_INCOMING, OdayCheque::DIRECTION_IN], true) && $cheque->client_id) {
            $payment = PaymentFactory::create(
                $user->companyId(),
                $user->id,
                (int) $cheque->client_id,
            );

            $payload = [
                'amount' => (float) $cheque->amountForApi(),
                'client_id' => (int) $cheque->client_id,
                'date' => Carbon::now()->format('Y-m-d'),
                'type_id' => PaymentType::CHECK,
                'transaction_reference' => $cheque->number,
            ];

            if ($cheque->invoice_id) {
                $payload['invoices'] = [[
                    'invoice_id' => (int) $cheque->invoice_id,
                    'amount' => (float) $cheque->amount,
                ]];
            }

            $payment = $this->payments->save($payload, $payment);

            if ($payment) {
                $cheque->payment_id = $payment->id;
            }
        }

        $cheque->status = OdayCheque::STATUS_CLEARED;
        $cheque->save();

        return $cheque->fresh(['client', 'invoice', 'payment']);
    }
}
