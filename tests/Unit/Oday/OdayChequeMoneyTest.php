<?php

namespace Tests\Unit\Oday;

use App\Services\Oday\OdayChequeMoney;
use Tests\TestCase;

class OdayChequeMoneyTest extends TestCase
{
    public function test_jod_uses_three_decimals(): void
    {
        $this->assertSame('10.500', OdayChequeMoney::normalize('10.5', OdayChequeMoney::CURRENCY_JOD));
    }

    public function test_ils_uses_two_decimals(): void
    {
        $this->assertSame('10.50', OdayChequeMoney::normalize('10.5', OdayChequeMoney::CURRENCY_ILS));
    }

    public function test_rejects_excess_fraction_for_ils(): void
    {
        $this->expectException(\Illuminate\Validation\ValidationException::class);
        OdayChequeMoney::normalize('10.555', OdayChequeMoney::CURRENCY_ILS);
    }
}
