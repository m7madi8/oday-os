<?php

namespace Tests\Unit\Oday;

use App\Http\Middleware\RequireHttps;
use Illuminate\Http\Request;
use Tests\TestCase;

class RequireHttpsTest extends TestCase
{
    protected function tearDown(): void
    {
        Request::setTrustedProxies([], Request::HEADER_X_FORWARDED_PROTO);
        parent::tearDown();
    }

    public function test_plain_http_api_is_refused_only_when_required(): void
    {
        $request = Request::create('/api/v1/ping', 'GET');
        $request->headers->set('Accept', 'application/json');
        $middleware = new RequireHttps();

        config(['ninja.require_https' => false]);
        $open = $middleware->handle($request, fn () => response('ok', 200));
        $this->assertSame(200, $open->getStatusCode());

        config(['ninja.require_https' => true]);
        $closed = $middleware->handle($request, fn () => response('ok', 200));
        $this->assertSame(426, $closed->getStatusCode());
    }

    public function test_forwarded_https_is_accepted_from_a_trusted_proxy(): void
    {
        config([
            'ninja.require_https' => true,
            'ninja.trusted_proxies' => '127.0.0.1',
        ]);
        Request::setTrustedProxies(['127.0.0.1'], Request::HEADER_X_FORWARDED_PROTO);
        $request = Request::create('/api/v1/ping', 'GET', [], [], [], [
            'REMOTE_ADDR' => '127.0.0.1',
            'HTTP_X_FORWARDED_PROTO' => 'https',
            'HTTP_ACCEPT' => 'application/json',
        ]);
        $this->assertTrue($request->isSecure());

        $response = (new RequireHttps())->handle($request, fn () => response('ok', 200));
        $this->assertSame(200, $response->getStatusCode());
    }

    public function test_forwarded_https_from_an_untrusted_proxy_is_refused(): void
    {
        config([
            'ninja.require_https' => true,
            'ninja.trusted_proxies' => null,
        ]);
        Request::setTrustedProxies([], Request::HEADER_X_FORWARDED_PROTO);
        $request = Request::create('/api/v1/ping', 'GET', [], [], [], [
            'REMOTE_ADDR' => '203.0.113.10',
            'HTTP_X_FORWARDED_PROTO' => 'https',
            'HTTP_ACCEPT' => 'application/json',
        ]);
        $this->assertFalse($request->isSecure());

        $response = (new RequireHttps())->handle($request, fn () => response('ok', 200));
        $this->assertSame(426, $response->getStatusCode());
    }
}
