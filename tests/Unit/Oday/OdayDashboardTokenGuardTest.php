<?php

namespace Tests\Unit\Oday;

use App\Services\Oday\OdayDashboardTokenGuard;
use RuntimeException;
use Tests\TestCase;

class OdayDashboardTokenGuardTest extends TestCase
{
    private string $previousEnv;

    protected function setUp(): void
    {
        parent::setUp();
        $this->previousEnv = (string) $this->app['env'];
    }

    protected function tearDown(): void
    {
        $this->app['env'] = $this->previousEnv;
        parent::tearDown();
    }

    public function test_guard_no_op_during_phpunit_when_token_empty(): void
    {
        config(['oday.dashboard_token' => '']);

        OdayDashboardTokenGuard::ensureProductionConfigured($this->app);

        $this->assertTrue($this->app->runningUnitTests());
        $this->assertSame('testing', $this->app->environment());
    }

    public function test_guard_allows_production_when_token_configured(): void
    {
        $this->app['env'] = 'production';
        config(['oday.dashboard_token' => 'configured-secret']);

        OdayDashboardTokenGuard::ensureProductionConfigured($this->app);

        $this->addToAssertionCount(1);
    }

    public function test_guard_throws_in_production_without_token(): void
    {
        $this->app['env'] = 'production';
        config(['oday.dashboard_token' => '']);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('ODAY_DASHBOARD_TOKEN');

        OdayDashboardTokenGuard::ensureProductionConfigured($this->app);
    }

    public function test_guard_allows_local_without_token(): void
    {
        $this->app['env'] = 'local';
        config(['oday.dashboard_token' => '']);

        OdayDashboardTokenGuard::ensureProductionConfigured($this->app);

        $this->addToAssertionCount(1);
    }
}
