<?php

namespace Tests\Unit\Oday;

use App\Http\Middleware\VerifyCronSecret;
use Illuminate\Http\Request;
use Tests\TestCase;

class VerifyCronSecretTest extends TestCase
{
    public function test_rejects_when_cron_secret_not_configured(): void
    {
        config(['oday.backup.cron_secret' => '']);

        $middleware = new VerifyCronSecret();
        $request = Request::create('/api/backup/run-scheduled', 'POST');

        $response = $middleware->handle($request, fn () => response()->json(['ok' => true]));

        $this->assertSame(401, $response->getStatusCode());
    }

    public function test_rejects_wrong_header(): void
    {
        config(['oday.backup.cron_secret' => 'expected-cron-secret-for-unit-test']);

        $middleware = new VerifyCronSecret();
        $request = Request::create('/api/backup/run-scheduled', 'POST');
        $request->headers->set('X-CRON-SECRET', 'wrong');

        $response = $middleware->handle($request, fn () => response()->json(['ok' => true]));

        $this->assertSame(401, $response->getStatusCode());
    }

    public function test_accepts_correct_header(): void
    {
        config(['oday.backup.cron_secret' => 'expected-cron-secret-for-unit-test']);

        $middleware = new VerifyCronSecret();
        $request = Request::create('/api/backup/run-scheduled', 'POST');
        $request->headers->set('X-CRON-SECRET', 'expected-cron-secret-for-unit-test');

        $response = $middleware->handle($request, fn () => response()->json(['ok' => true]));

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(['ok' => true], $response->getData(true));
    }
}
