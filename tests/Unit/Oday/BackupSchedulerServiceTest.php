<?php

namespace Tests\Unit\Oday;

use App\Models\OdayBackupRun;
use App\Models\OdayBackupSetting;
use App\Services\Oday\Backup\BackupRunner;
use App\Services\Oday\Backup\BackupSchedulerService;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class BackupSchedulerServiceTest extends TestCase
{
    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function eligibleSetting(array $overrides = []): OdayBackupSetting
    {
        config(['oday.backup.encryption_key' => 'unit-test-key']);

        $model = new OdayBackupSetting();
        $model->forceFill(array_merge([
            'company_id' => 1,
            'drive_enabled' => false,
            'local_enabled' => true,
            'frequency' => 'daily',
            'time_of_day' => '03:00',
            'timezone' => 'UTC',
            'last_scheduled_at' => null,
        ], $overrides));

        return $model;
    }

    private function scheduler(?BackupRunner $runner = null): BackupSchedulerService
    {
        $runner ??= new class implements BackupRunner {
            public function run(int $companyId, string $type = OdayBackupRun::TYPE_MANUAL): OdayBackupRun
            {
                throw new \RuntimeException('backup runner should not be invoked');
            }
        };

        return new BackupSchedulerService($runner);
    }

    public function test_is_due_false_when_destinations_disabled_even_in_schedule_window(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-03-15 04:00:00', 'UTC'));
        $scheduler = $this->scheduler();
        $setting = $this->eligibleSetting(['drive_enabled' => false, 'local_enabled' => false]);

        $this->assertFalse($scheduler->isDue($setting));
    }

    public function test_is_due_false_when_encryption_missing(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-03-15 04:00:00', 'UTC'));
        config(['oday.backup.encryption_key' => '']);

        $scheduler = $this->scheduler();
        $setting = $this->eligibleSetting();
        config(['oday.backup.encryption_key' => '']);

        $this->assertFalse($scheduler->isDue($setting));
    }

    public function test_is_due_true_in_window_for_eligible_setting(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-03-15 04:00:00', 'UTC'));
        $scheduler = $this->scheduler();
        $setting = $this->eligibleSetting();

        $this->assertTrue($scheduler->isDue($setting));
    }

    public function test_is_due_false_before_scheduled_time(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-03-15 02:30:00', 'UTC'));
        $scheduler = $this->scheduler();
        $setting = $this->eligibleSetting();

        $this->assertFalse($scheduler->isDue($setting));
        $this->assertFalse($scheduler->matchesScheduleWindow($setting));
    }

    public function test_is_due_false_after_successful_run_same_day(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-03-15 05:00:00', 'UTC'));
        $scheduler = $this->scheduler();
        $setting = $this->eligibleSetting([
            'last_scheduled_at' => Carbon::parse('2026-03-15 04:30:00', 'UTC'),
        ]);

        $this->assertFalse($scheduler->isDue($setting));
    }

}
