<?php

namespace Tests\Unit\Oday;

use App\Models\OdayBackupSetting;
use App\Services\Oday\Backup\BackupScheduleEligibility;
use Tests\TestCase;

class BackupScheduleEligibilityTest extends TestCase
{
    private function setting(array $overrides = []): OdayBackupSetting
    {
        $model = new OdayBackupSetting();
        $model->forceFill(array_merge([
            'company_id' => 1,
            'drive_enabled' => true,
            'local_enabled' => false,
            'frequency' => 'daily',
            'time_of_day' => '03:00',
            'timezone' => 'UTC',
        ], $overrides));

        return $model;
    }

    public function test_skips_when_no_destination_enabled(): void
    {
        $setting = $this->setting(['drive_enabled' => false, 'local_enabled' => false]);

        $this->assertSame('no_destination_enabled', BackupScheduleEligibility::scheduledSkipReason($setting));
        $this->assertFalse(BackupScheduleEligibility::canRunScheduledBackup($setting));
    }

    public function test_skips_when_encryption_key_missing(): void
    {
        config(['oday.backup.encryption_key' => '']);
        $setting = $this->setting(['local_enabled' => true]);

        $this->assertSame('encryption_not_configured', BackupScheduleEligibility::scheduledSkipReason($setting));
    }

    public function test_allows_when_destination_and_encryption_configured(): void
    {
        config(['oday.backup.encryption_key' => 'unit-test-key']);
        $setting = $this->setting(['drive_enabled' => false, 'local_enabled' => true]);

        $this->assertNull(BackupScheduleEligibility::scheduledSkipReason($setting));
        $this->assertTrue(BackupScheduleEligibility::canRunScheduledBackup($setting));
    }

    public function test_skips_invalid_schedule(): void
    {
        config(['oday.backup.encryption_key' => 'unit-test-key']);
        $setting = $this->setting(['frequency' => 'hourly', 'time_of_day' => '03:00']);

        $this->assertSame('schedule_not_configured', BackupScheduleEligibility::scheduledSkipReason($setting));
    }

    public function test_weekly_requires_valid_weekday(): void
    {
        config(['oday.backup.encryption_key' => 'unit-test-key']);
        $setting = $this->setting([
            'frequency' => 'weekly',
            'weekday' => 9,
            'time_of_day' => '03:00',
        ]);

        $this->assertSame('schedule_not_configured', BackupScheduleEligibility::scheduledSkipReason($setting));
    }

    public function test_weekly_defaults_missing_weekday_to_monday(): void
    {
        config(['oday.backup.encryption_key' => 'unit-test-key']);
        $setting = $this->setting([
            'frequency' => 'weekly',
            'weekday' => null,
            'time_of_day' => '03:00',
        ]);

        $this->assertNull(BackupScheduleEligibility::scheduledSkipReason($setting));
    }
}
