<?php

namespace Tests\Unit\Oday;

use App\Http\Controllers\Oday\OdayBackupController;
use App\Services\Oday\Backup\BackupRestoreService;
use App\Services\Oday\Backup\BackupRestoreUnavailable;
use App\Utils\TruthSource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class BackupRestoreBlockedTest extends TestCase
{
    public function test_restore_service_refuses_before_any_sql_or_file_write(): void
    {
        DB::spy();
        File::spy();

        $service = new BackupRestoreService();

        try {
            $service->restoreFromRun(4, 9);
            $this->fail('Unsafe restore was executed.');
        } catch (BackupRestoreUnavailable $exception) {
            $this->assertSame(BackupRestoreUnavailable::CODE, $exception->getMessage());
        }

        DB::shouldNotHaveReceived('unprepared');
        DB::shouldNotHaveReceived('statement');
        DB::shouldNotHaveReceived('affectingStatement');
        File::shouldNotHaveReceived('put');
        File::shouldNotHaveReceived('copy');
        File::shouldNotHaveReceived('get');
    }

    public function test_controller_blocks_confirmed_restore_without_writing(): void
    {
        DB::spy();
        File::spy();

        $truth = \Mockery::mock(TruthSource::class);
        $truth->shouldReceive('getCompany')->once()->andReturn((object) ['id' => 15]);
        $this->app->instance(TruthSource::class, $truth);

        $request = Request::create('/api/backup/restore', 'POST', [
            'run_id' => 3,
            'confirm' => true,
        ]);

        $response = $this->app->make(OdayBackupController::class)
            ->restore($request, new BackupRestoreService());

        $this->assertSame(409, $response->getStatusCode());
        $this->assertSame('restore_disabled', $response->getData(true)['code']);
        DB::shouldNotHaveReceived('unprepared');
        File::shouldNotHaveReceived('put');
        File::shouldNotHaveReceived('copy');
    }

    public function test_controller_still_requires_confirmation_before_the_block(): void
    {
        DB::spy();

        $request = Request::create('/api/backup/restore', 'POST', [
            'run_id' => 3,
            'confirm' => false,
        ]);

        $response = $this->app->make(OdayBackupController::class)
            ->restore($request, new BackupRestoreService());

        $this->assertSame(422, $response->getStatusCode());
        DB::shouldNotHaveReceived('unprepared');
    }

    public function test_direct_http_restore_without_token_stays_unauthorized(): void
    {
        $this->postJson('/api/backup/restore', [
            'run_id' => 1,
            'confirm' => true,
        ])->assertStatus(403)
            ->assertJson(['message' => 'Invalid token']);
    }

    public function test_backup_creation_and_download_routes_remain_registered(): void
    {
        $routes = collect(\Illuminate\Support\Facades\Route::getRoutes());

        $run = $routes->first(fn ($route) => $route->uri() === 'api/backup/run' && in_array('POST', $route->methods(), true));
        $download = $routes->first(fn ($route) => $route->uri() === 'api/backup/runs/{id}/download' && in_array('GET', $route->methods(), true));
        $restore = $routes->first(fn ($route) => $route->uri() === 'api/backup/restore' && in_array('POST', $route->methods(), true));

        $this->assertNotNull($run);
        $this->assertNotNull($download);
        $this->assertNotNull($restore);
        $this->assertContains('oday.backup.superuser', $run->middleware());
        $this->assertContains('oday.backup.superuser', $download->middleware());
        $this->assertContains('oday.backup.superuser', $restore->middleware());
        $this->assertTrue(method_exists(\App\Services\Oday\Backup\BackupEngine::class, 'run'));
        $this->assertTrue(method_exists(\App\Services\Oday\Backup\BackupSchedulerService::class, 'runDueBackups'));
    }
}
