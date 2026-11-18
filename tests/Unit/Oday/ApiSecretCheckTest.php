<?php

namespace Tests\Unit\Oday;

use App\Http\Middleware\ApiSecretCheck;
use Illuminate\Http\Request;
use Tests\TestCase;

class ApiSecretCheckTest extends TestCase
{
    public function test_passes_through_when_api_secret_not_configured(): void
    {
        config(['ninja.api_secret' => '']);

        $middleware = new ApiSecretCheck();
        $request = Request::create('/api/v1/login', 'POST');

        $response = $middleware->handle($request, fn () => response()->json(['passed' => true]));

        $this->assertSame(200, $response->getStatusCode());
    }

    public function test_rejects_when_secret_configured_but_header_missing_or_wrong(): void
    {
        config(['ninja.api_secret' => 'api-secret-for-unit-test']);

        $middleware = new ApiSecretCheck();
        $request = Request::create('/api/v1/login', 'POST');
        $request->headers->set('X-API-SECRET', 'wrong');

        $response = $middleware->handle($request, fn () => response()->json(['passed' => true]));

        $this->assertSame(403, $response->getStatusCode());
    }

    public function test_accepts_matching_header_when_secret_configured(): void
    {
        config(['ninja.api_secret' => 'api-secret-for-unit-test']);

        $middleware = new ApiSecretCheck();
        $request = Request::create('/api/v1/login', 'POST');
        $request->headers->set('X-API-SECRET', 'api-secret-for-unit-test');

        $response = $middleware->handle($request, fn () => response()->json(['passed' => true]));

        $this->assertSame(200, $response->getStatusCode());
    }
}
