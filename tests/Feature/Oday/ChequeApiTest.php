<?php

namespace Tests\Feature\Oday;

use App\Models\Client;
use App\Models\OdayCheque;
use App\Models\OdayChequeStatusHistory;
use App\Models\User;
use App\Services\Oday\OdayChequeStatusService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Carbon;
use App\Utils\Traits\MakesHash;
use Tests\MockAccountData;
use Tests\TestCase;

class ChequeApiTest extends TestCase
{
    use DatabaseTransactions;
    use MakesHash;
    use MockAccountData;

    private OdayChequeStatusService $statuses;

    protected function setUp(): void
    {
        parent::setUp();
        $this->makeTestData();
        $this->statuses = app(OdayChequeStatusService::class);
    }

    private function apiHeaders(): array
    {
        return [
            'X-API-SECRET' => config('ninja.api_secret'),
            'X-API-TOKEN' => $this->token,
        ];
    }

    public function test_incoming_creation_writes_history(): void
    {
        $response = $this->withHeaders($this->apiHeaders())->postJson('/api/v1/cheques', [
            'direction' => 'incoming',
            'cheque_number' => 'IN-100',
            'amount' => '1500.00',
            'currency' => 'ILS',
            'client_id' => $this->client->hashed_id,
            'issue_date' => '2026-01-01',
            'due_date' => '2026-02-01',
        ]);

        $response->assertCreated();
        $id = $response->json('data.id');
        $cheque = OdayCheque::find($this->decodePrimaryKey($id));
        $this->assertSame(OdayCheque::STATUS_RECEIVED, $cheque->status);
        $this->assertSame(150000, $cheque->amount_minor);
        $this->assertDatabaseHas('oday_cheque_status_histories', [
            'cheque_id' => $cheque->id,
            'old_status' => null,
            'new_status' => OdayCheque::STATUS_RECEIVED,
        ]);
    }

    public function test_outgoing_requires_payee_or_vendor(): void
    {
        $this->withHeaders($this->apiHeaders())->postJson('/api/v1/cheques', [
            'direction' => 'outgoing',
            'cheque_number' => 'OUT-1',
            'amount' => '10.00',
            'currency' => 'ILS',
        ])->assertStatus(422);
    }

    public function test_due_date_before_issue_date_rejected(): void
    {
        $this->withHeaders($this->apiHeaders())->postJson('/api/v1/cheques', [
            'direction' => 'incoming',
            'cheque_number' => 'IN-101',
            'amount' => '10.00',
            'currency' => 'ILS',
            'client_id' => $this->client->hashed_id,
            'issue_date' => '2026-03-01',
            'due_date' => '2026-02-01',
        ])->assertStatus(422)->assertJsonValidationErrors(['due_date']);
    }

    public function test_duplicate_cheque_rejected(): void
    {
        $payload = [
            'direction' => 'incoming',
            'cheque_number' => 'DUP-1',
            'amount' => '10.00',
            'currency' => 'ILS',
            'client_id' => $this->client->hashed_id,
            'bank_id' => 'bank-a',
            'account_reference' => '123456',
        ];

        $this->withHeaders($this->apiHeaders())->postJson('/api/v1/cheques', $payload)->assertCreated();
        $this->withHeaders($this->apiHeaders())->postJson('/api/v1/cheques', $payload)->assertStatus(422);
    }

    public function test_valid_incoming_transitions_and_invalid_rejected(): void
    {
        $cheque = $this->createIncomingCheque();
        $path = [
            OdayCheque::STATUS_DEPOSITED,
            OdayCheque::STATUS_PROCESSING,
            OdayCheque::STATUS_CLEARED,
        ];

        foreach ($path as $status) {
            $this->withHeaders($this->apiHeaders())->postJson("/api/v1/cheques/{$cheque->hashed_id}/transition", [
                'status' => $status,
            ])->assertOk();
            $cheque->refresh();
            $this->assertSame($status, $cheque->status);
        }

        $this->withHeaders($this->apiHeaders())->postJson("/api/v1/cheques/{$cheque->hashed_id}/transition", [
            'status' => OdayCheque::STATUS_DEPOSITED,
        ])->assertStatus(422);
    }

    public function test_returned_and_cancelled_require_reason(): void
    {
        $cheque = $this->createIncomingCheque('RET-1');
        $this->advanceTo($cheque, OdayCheque::STATUS_PROCESSING);

        $this->withHeaders($this->apiHeaders())->postJson("/api/v1/cheques/{$cheque->hashed_id}/transition", [
            'status' => OdayCheque::STATUS_RETURNED,
        ])->assertStatus(422);

        $this->withHeaders($this->apiHeaders())->postJson("/api/v1/cheques/{$cheque->hashed_id}/transition", [
            'status' => OdayCheque::STATUS_RETURNED,
            'reason' => 'رفض البنك',
        ])->assertOk();
    }

    public function test_overdue_is_derived_not_persisted(): void
    {
        $cheque = $this->createIncomingCheque('OD-1');
        $cheque->due_date = Carbon::yesterday()->toDateString();
        $cheque->save();

        $response = $this->withHeaders($this->apiHeaders())->getJson('/api/v1/cheques?overdue=1');
        $response->assertOk();
        $this->assertTrue(collect($response->json('data'))->contains(fn ($row) => $row['id'] === $cheque->hashed_id));
        $this->assertNull($cheque->getAttributes()['is_overdue'] ?? null);
    }

    public function test_summary_buckets_per_currency(): void
    {
        $this->createIncomingCheque('SUM-ILS', '100.00', 'ILS');
        $this->withHeaders($this->apiHeaders())->postJson('/api/v1/cheques', [
            'direction' => 'incoming',
            'cheque_number' => 'SUM-USD',
            'amount' => '50.00',
            'currency' => 'USD',
            'client_id' => $this->client->hashed_id,
        ])->assertCreated();

        $response = $this->withHeaders($this->apiHeaders())->getJson('/api/v1/cheques/summary?direction=incoming');
        $response->assertOk();
        $currencies = $response->json('data.currencies');
        $this->assertArrayHasKey('ILS', $currencies);
        $this->assertArrayHasKey('USD', $currencies);
    }

    public function test_office_scoping_blocks_other_company(): void
    {
        $cheque = $this->createIncomingCheque('SCOPE-1');
        $foreign = new OdayCheque();
        $foreign->company_id = $this->company->id + 9999;
        $foreign->user_id = $this->user->id;
        $foreign->client_id = $this->client->id;
        $foreign->number = 'FOREIGN';
        $foreign->direction = OdayCheque::DIRECTION_INCOMING;
        $foreign->status = OdayCheque::STATUS_RECEIVED;
        $foreign->amount_minor = 1000;
        $foreign->amount = '10.00';
        $foreign->currency_code = 'ILS';
        $foreign->dedupe_key = hash('sha256', 'foreign|scope|1');
        $foreign->save();

        $this->withHeaders($this->apiHeaders())->getJson("/api/v1/cheques/{$foreign->hashed_id}")->assertStatus(404);
        $this->withHeaders($this->apiHeaders())->getJson("/api/v1/cheques/{$cheque->hashed_id}")->assertOk();
    }

    public function test_status_history_is_timeline_source(): void
    {
        $cheque = $this->createIncomingCheque('HIST-1');
        $this->advanceTo($cheque, OdayCheque::STATUS_DEPOSITED);

        $count = OdayChequeStatusHistory::query()->where('cheque_id', $cheque->id)->count();
        $this->assertGreaterThanOrEqual(2, $count);

        $response = $this->withHeaders($this->apiHeaders())->getJson("/api/v1/cheques/{$cheque->hashed_id}");
        $response->assertOk();
        $this->assertNotEmpty($response->json('data.status_history'));
    }

    private function createIncomingCheque(string $number = 'IN-DEF', string $amount = '10.00', string $currency = 'ILS'): OdayCheque
    {
        $response = $this->withHeaders($this->apiHeaders())->postJson('/api/v1/cheques', [
            'direction' => 'incoming',
            'cheque_number' => $number,
            'amount' => $amount,
            'currency' => $currency,
            'client_id' => $this->client->hashed_id,
            'issue_date' => Carbon::today()->toDateString(),
            'due_date' => Carbon::today()->addMonth()->toDateString(),
        ]);
        $response->assertCreated();

        return OdayCheque::find($this->decodePrimaryKey($response->json('data.id')));
    }

    private function advanceTo(OdayCheque $cheque, string $target): void
    {
        $steps = $this->statuses->normalizeDirection($cheque->direction) === OdayCheque::DIRECTION_INCOMING
            ? [OdayCheque::STATUS_DEPOSITED, OdayCheque::STATUS_PROCESSING, OdayCheque::STATUS_CLEARED]
            : [OdayCheque::STATUS_PRINTED, OdayCheque::STATUS_DELIVERED, OdayCheque::STATUS_CLEARED];

        foreach ($steps as $status) {
            if ($status === $target) {
                $this->withHeaders($this->apiHeaders())->postJson("/api/v1/cheques/{$cheque->hashed_id}/transition", ['status' => $status])->assertOk();
                return;
            }
            $this->withHeaders($this->apiHeaders())->postJson("/api/v1/cheques/{$cheque->hashed_id}/transition", ['status' => $status])->assertOk();
            $cheque->refresh();
        }
    }
}
