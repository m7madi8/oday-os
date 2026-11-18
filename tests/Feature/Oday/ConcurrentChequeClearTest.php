<?php

namespace Tests\Feature\Oday;

use App\Models\OdayCheque;
use App\Utils\Traits\MakesHash;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\MockAccountData;
use Tests\TestCase;

class ConcurrentChequeClearTest extends TestCase
{
    use MakesHash;
    use MockAccountData;

    protected function setUp(): void
    {
        parent::setUp();
        $this->makeTestData();
    }

    public function test_two_http_workers_do_not_create_two_payments_for_one_cheque(): void
    {
        $this->assertSame('oday_financial_verification', DB::connection()->getDatabaseName());
        $this->assertSame('3307', (string) DB::connection()->getConfig('port'));

        $cheque = $this->createProcessingCheque();
        $before = (int) DB::table('payments')->where('transaction_reference', 'CONCURRENT-CLEAR')->count();
        $left = tempnam(sys_get_temp_dir(), 'oday-clear-a');
        $right = tempnam(sys_get_temp_dir(), 'oday-clear-b');
        $procs = [
            $this->startWorker($cheque->hashed_id, $left),
            $this->startWorker($cheque->hashed_id, $right),
        ];

        $codes = [];
        foreach ($procs as [$process, $pipes, $file]) {
            $codes[] = $this->finishWorker($process, $pipes, $file);
        }

        $cheque->refresh();
        $payments = (int) DB::table('payments')->where('transaction_reference', 'CONCURRENT-CLEAR')->count();

        $this->assertSame($before + 1, $payments);
        $this->assertNotNull($cheque->payment_id);
        $this->assertSame(OdayCheque::STATUS_CLEARED, $cheque->status);
        $this->assertContains(200, $codes);
        foreach ($codes as $code) {
            $this->assertContains($code, [200, 422]);
        }
    }

    private function createProcessingCheque(): OdayCheque
    {
        $created = $this->withHeaders($this->headers())->postJson('/api/v1/cheques', [
            'direction' => 'incoming',
            'cheque_number' => 'CONCURRENT-CLEAR',
            'amount' => '10.10',
            'currency' => 'ILS',
            'client_id' => $this->client->hashed_id,
            'issue_date' => Carbon::today()->toDateString(),
            'due_date' => Carbon::today()->addMonth()->toDateString(),
        ]);
        $created->assertCreated();
        $cheque = OdayCheque::find($this->decodePrimaryKey($created->json('data.id')));
        foreach ([OdayCheque::STATUS_DEPOSITED, OdayCheque::STATUS_PROCESSING] as $status) {
            $this->withHeaders($this->headers())
                ->postJson("/api/v1/cheques/{$cheque->hashed_id}/transition", ['status' => $status])
                ->assertOk();
        }

        return $cheque->fresh();
    }

    /**
     * @return array{0: resource, 1: array<int, resource>, 2: string}
     */
    private function startWorker(string $hash, string $file): array
    {
        $command = [
            PHP_BINARY,
            base_path('tests/Feature/Oday/concurrent_clear_worker.php'),
            $hash,
            (string) $this->token,
            (string) config('ninja.api_secret'),
            $file,
        ];
        $pipes = [];
        $process = proc_open($command, [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, base_path());
        $this->assertIsResource($process);

        return [$process, $pipes, $file];
    }

    /**
     * @param  array<int, resource>  $pipes
     */
    private function finishWorker($process, array $pipes, string $file): int
    {
        $stdout = stream_get_contents($pipes[1]);
        $stderr = stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        $exit = proc_close($process);
        $code = trim((string) @file_get_contents($file));
        @unlink($file);
        $this->assertSame(0, $exit, trim($stdout."\n".$stderr));
        $this->assertNotSame('', $code);

        return (int) $code;
    }

    /**
     * @return array<string, string>
     */
    private function headers(): array
    {
        return [
            'X-API-SECRET' => config('ninja.api_secret'),
            'X-API-TOKEN' => $this->token,
        ];
    }
}
