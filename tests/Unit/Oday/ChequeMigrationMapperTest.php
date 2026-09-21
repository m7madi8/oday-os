<?php

namespace Tests\Unit\Oday;

use App\Models\OdayCheque;
use App\Services\Oday\Cheque\ChequeMigrationMapper;
use Tests\TestCase;

class ChequeMigrationMapperTest extends TestCase
{
    public function test_maps_legacy_directions_to_incoming(): void
    {
        $mapper = new ChequeMigrationMapper();
        $unmapped = [];

        $this->assertSame(OdayCheque::DIRECTION_INCOMING, $mapper->mapDirection('in', $unmapped));
        $this->assertSame(OdayCheque::DIRECTION_OUTGOING, $mapper->mapDirection('out', $unmapped));
        $this->assertSame([], $unmapped);
    }

    public function test_maps_legacy_statuses(): void
    {
        $mapper = new ChequeMigrationMapper();
        $unmapped = [];

        $this->assertSame(OdayCheque::STATUS_RECEIVED, $mapper->mapStatus('pending', OdayCheque::DIRECTION_INCOMING, $unmapped));
        $this->assertSame(OdayCheque::STATUS_RETURNED, $mapper->mapStatus('bounced', OdayCheque::DIRECTION_INCOMING, $unmapped));
    }

    public function test_reports_unmapped_status(): void
    {
        $mapper = new ChequeMigrationMapper();
        $unmapped = [];
        $result = $mapper->mapStatus('weird_status', OdayCheque::DIRECTION_INCOMING, $unmapped);

        $this->assertSame(OdayCheque::STATUS_RECEIVED, $result);
        $this->assertSame(['weird_status'], $unmapped);
    }
}
