<?php

namespace Tests\Unit\Oday;

use App\Services\Oday\Reports\OdayOfficeReportService;
use Illuminate\Support\Facades\DB;
use Mockery;
use ReflectionMethod;
use Tests\TestCase;

class OfficeReportFiguresTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $builder = Mockery::mock();
        $builder->shouldReceive('hasTable')->andReturn(false);
        DB::shouldReceive('getSchemaBuilder')->andReturn($builder);
    }
    public function test_same_currency_values_sum_past_five_hundred_without_float_cast(): void
    {
        $total = '0.000000';
        for ($i = 0; $i < 1000; $i++) {
            $total = bcadd($total, '1.00', 6);
        }
        $total = bcadd($total, '0.10', 6);

        $presented = $this->present([1 => $total]);

        $this->assertSame('1000.10', $presented['amount']);
        $this->assertFalse($presented['mixed']);
        $this->assertNull($presented['label']);
    }

    public function test_different_currencies_are_not_added_together(): void
    {
        $presented = $this->present([
            1 => '10.100000',
            2 => '5.000000',
        ]);

        $this->assertNull($presented['amount']);
        $this->assertTrue($presented['mixed']);
        $this->assertStringContainsString('10.10', (string) $presented['label']);
        $this->assertStringContainsString('5.00', (string) $presented['label']);
        $this->assertStringNotContainsString('15.10', (string) $presented['label']);
    }

    public function test_net_keeps_each_currency_separate(): void
    {
        $net = $this->invoke('netBuckets', [
            [1 => '10.000000', 2 => '5.000000'],
            [1 => '1.250000'],
        ]);

        $this->assertSame('8.750000', $net[1]);
        $this->assertSame('5.000000', $net[2]);
        $this->assertNull($this->present($net)['amount']);
        $this->assertSame('8.75', $this->present([1 => $net[1]])['amount']);
    }

    public function test_jod_scale_is_preserved(): void
    {
        $presented = $this->present([3 => '1.234000']);

        $this->assertSame('1.234', $presented['amount']);
    }

    /**
     * @param  array<int, string>  $buckets
     * @return array<string, mixed>
     */
    private function present(array $buckets): array
    {
        return $this->invoke('present', [$buckets]);
    }

    /**
     * @param  array<int, mixed>  $arguments
     * @return mixed
     */
    private function invoke(string $method, array $arguments): mixed
    {
        $reflection = new ReflectionMethod(OdayOfficeReportService::class, $method);
        $reflection->setAccessible(true);

        return $reflection->invoke(new OdayOfficeReportService(), ...$arguments);
    }
}
