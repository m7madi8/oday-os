<?php

namespace Tests\Unit\Oday;

use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class BackupRoutesMiddlewareTest extends TestCase
{
    /**
     * @return array<int, string>
     */
    private function middlewareFor(string $method, string $uri): array
    {
        $route = collect(Route::getRoutes())->first(function ($route) use ($method, $uri) {
            return in_array($method, $route->methods(), true) && $route->uri() === $uri;
        });

        $this->assertNotNull($route, "Route not found: {$method} {$uri}");

        return $route->middleware();
    }

    public function test_read_routes_use_token_auth_without_superuser_gate(): void
    {
        foreach (['GET api/backup/settings', 'GET api/backup/runs'] as $pair) {
            [$method, $uri] = explode(' ', $pair, 2);
            $middleware = $this->middlewareFor($method, $uri);
            $this->assertContains('token_auth', $middleware);
            $this->assertNotContains('oday.backup.superuser', $middleware);
        }
    }

    public function test_manage_routes_require_superuser_middleware(): void
    {
        $manage = [
            'PUT api/backup/settings',
            'POST api/backup/test-local',
            'GET api/backup/google/connect',
            'DELETE api/backup/google',
            'POST api/backup/run',
            'POST api/backup/runs/{id}/retry',
            'GET api/backup/runs/{id}/download',
            'POST api/backup/runs/{id}/local-synced',
            'POST api/backup/restore',
        ];

        foreach ($manage as $pair) {
            [$method, $uri] = explode(' ', $pair, 2);
            $middleware = $this->middlewareFor($method, $uri);
            $this->assertContains('token_auth', $middleware);
            $this->assertContains('oday.backup.superuser', $middleware);
        }
    }

    public function test_scheduled_route_uses_cron_secret_not_token_auth(): void
    {
        $middleware = $this->middlewareFor('POST', 'api/backup/run-scheduled');
        $this->assertContains('cron.secret', $middleware);
        $this->assertNotContains('token_auth', $middleware);
        $this->assertNotContains('oday.backup.superuser', $middleware);
    }

    public function test_google_callback_is_public_oauth_handler(): void
    {
        $middleware = $this->middlewareFor('GET', 'api/backup/google/callback');
        $this->assertNotContains('token_auth', $middleware);
        $this->assertNotContains('oday.backup.superuser', $middleware);
    }
}
