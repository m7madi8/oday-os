<?php

namespace Tests\Unit\Oday;

use App\Models\OdayCheque;
use App\Repositories\PaymentRepository;
use App\Services\Oday\OdayChequePaymentService;
use Mockery;
use Tests\TestCase;

class ChequePaymentAmountTest extends TestCase
{
    public function test_payment_payload_uses_decimal_strings_for_supported_currencies(): void
    {
        $service = new OdayChequePaymentService(Mockery::mock(PaymentRepository::class));

        $ils = $this->cheque(1010, 'ILS', '10.10');
        $usd = $this->cheque(123456, 'USD', '1234.56');
        $jod = $this->cheque(1234, 'JOD', '1.234');

        $this->assertSame('10.10', $service->paymentAmount($ils));
        $this->assertSame('1234.56', $service->paymentAmount($usd));
        $this->assertSame('1.234', $service->paymentAmount($jod));

        $payload = $service->paymentPayload($ils);
        $this->assertIsString($payload['amount']);
        $this->assertSame('10.10', $payload['amount']);
        $this->assertSame('10.10', $payload['invoices'][0]['amount']);
    }

    public function test_existing_payment_link_does_not_request_another_payment(): void
    {
        $service = new OdayChequePaymentService(Mockery::mock(PaymentRepository::class));
        $cheque = $this->cheque(1010, 'ILS', '10.10');
        $cheque->payment_id = 44;

        $this->assertFalse($service->shouldCreatePayment($cheque));
    }

    public function test_outgoing_cheque_does_not_create_a_client_payment(): void
    {
        $service = new OdayChequePaymentService(Mockery::mock(PaymentRepository::class));
        $cheque = $this->cheque(1010, 'ILS', '10.10');
        $cheque->direction = OdayCheque::DIRECTION_OUTGOING;

        $this->assertFalse($service->shouldCreatePayment($cheque));
    }

    private function cheque(int $minor, string $currency, string $amount): OdayCheque
    {
        $cheque = new OdayCheque();
        $cheque->amount_minor = $minor;
        $cheque->currency_code = $currency;
        $cheque->amount = $amount;
        $cheque->client_id = 7;
        $cheque->invoice_id = 9;
        $cheque->direction = OdayCheque::DIRECTION_INCOMING;
        $cheque->number = 'CHQ-1';

        return $cheque;
    }
}
