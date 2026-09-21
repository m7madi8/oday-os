<?php

namespace Tests\Unit\Oday;

use App\Models\OdayCheque;
use App\Services\Oday\OdayChequeStatusService;
use Illuminate\Support\Carbon;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class OdayChequeStatusServiceTest extends TestCase
{
    private OdayChequeStatusService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new OdayChequeStatusService();
    }

    public function test_incoming_linear_transitions(): void
    {
        $this->assertTrue($this->service->canTransition(OdayCheque::DIRECTION_INCOMING, OdayCheque::STATUS_RECEIVED, OdayCheque::STATUS_DEPOSITED));
        $this->assertTrue($this->service->canTransition(OdayCheque::DIRECTION_INCOMING, OdayCheque::STATUS_PROCESSING, OdayCheque::STATUS_CLEARED));
        $this->assertFalse($this->service->canTransition(OdayCheque::DIRECTION_INCOMING, OdayCheque::STATUS_RECEIVED, OdayCheque::STATUS_CLEARED));
    }

    public function test_outgoing_draft_never_overdue(): void
    {
        $cheque = new OdayCheque([
            'direction' => OdayCheque::DIRECTION_OUTGOING,
            'status' => OdayCheque::STATUS_DRAFT,
            'due_date' => Carbon::yesterday()->toDateString(),
        ]);

        $this->assertFalse($this->service->isOverdue($cheque));
    }

    public function test_overdue_when_due_date_passed_and_active(): void
    {
        $cheque = new OdayCheque([
            'direction' => OdayCheque::DIRECTION_INCOMING,
            'status' => OdayCheque::STATUS_DEPOSITED,
            'due_date' => Carbon::yesterday()->toDateString(),
        ]);

        $this->assertTrue($this->service->isOverdue($cheque));
    }

    #[DataProvider('terminalStatuses')]
    public function test_terminal_status_blocks_transition(string $status): void
    {
        $this->assertFalse($this->service->canTransition(OdayCheque::DIRECTION_INCOMING, $status, OdayCheque::STATUS_DEPOSITED));
    }

    public static function terminalStatuses(): array
    {
        return [
            [OdayCheque::STATUS_CLEARED],
            [OdayCheque::STATUS_RETURNED],
            [OdayCheque::STATUS_CANCELLED],
        ];
    }
}
