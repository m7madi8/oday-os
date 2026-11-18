<?php

namespace App\Services\Oday;

use App\Factory\PaymentFactory;
use App\Models\OdayCheque;
use App\Models\PaymentType;
use App\Models\User;
use App\Repositories\PaymentRepository;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OdayChequePaymentService
{
    public function __construct(private PaymentRepository $payments)
    {
    }

    public function clear(OdayCheque $cheque, User $user): OdayCheque
    {
        $apply = function () use ($cheque, $user): OdayCheque {
            $locked = OdayCheque::query()->whereKey($cheque->getKey())->lockForUpdate()->firstOrFail();

            return $this->applyClear($locked, $user);
        };

        if (DB::transactionLevel() > 0) {
            return $apply();
        }

        return DB::transaction($apply);
    }

    public function shouldCreatePayment(OdayCheque $cheque): bool
    {
        if ($cheque->payment_id) {
            return false;
        }

        return $cheque->client_id
            && in_array($cheque->direction, [OdayCheque::DIRECTION_INCOMING, OdayCheque::DIRECTION_IN], true);
    }

    /**
     * Decimal strings for Invoice Ninja's decimal(20,6) payment columns.
     * Invoice Ninja still adds client balances with PHP arithmetic; this method
     * only stops the cheque amount from being cast to float before persistence.
     *
     * @return array<string, mixed>
     */
    public function paymentPayload(OdayCheque $cheque): array
    {
        $amount = $this->paymentAmount($cheque);
        $payload = [
            'amount' => $amount,
            'client_id' => (int) $cheque->client_id,
            'date' => Carbon::now()->format('Y-m-d'),
            'type_id' => PaymentType::CHECK,
            'transaction_reference' => $cheque->number,
        ];

        if ($cheque->invoice_id) {
            $payload['invoices'] = [[
                'invoice_id' => (int) $cheque->invoice_id,
                'amount' => $amount,
            ]];
        }

        return $payload;
    }

    public function paymentAmount(OdayCheque $cheque): string
    {
        $currency = $cheque->currency_code ?: OdayChequeMoney::CURRENCY_ILS;

        return OdayChequeMoney::normalize($cheque->amountForApi(), $currency);
    }

    private function applyClear(OdayCheque $cheque, User $user): OdayCheque
    {
        if ($cheque->payment_id) {
            if ($cheque->status !== OdayCheque::STATUS_CLEARED) {
                $cheque->status = OdayCheque::STATUS_CLEARED;
                $cheque->save();
            }

            return $cheque->fresh(['client', 'invoice', 'payment']);
        }

        if ($this->shouldCreatePayment($cheque)) {
            $payment = PaymentFactory::create(
                $user->companyId(),
                $user->id,
                (int) $cheque->client_id,
            );
            $saved = $this->payments->save($this->paymentPayload($cheque), $payment);

            if (! $saved || ! $saved->id) {
                throw ValidationException::withMessages([
                    'cheque' => ['تعذر إنشاء دفعة الشيك'],
                ]);
            }

            $cheque->payment_id = $saved->id;
        }

        $cheque->status = OdayCheque::STATUS_CLEARED;
        $cheque->save();

        return $cheque->fresh(['client', 'invoice', 'payment']);
    }
}
