<?php

namespace App\Services\Oday\Backup;

use App\Models\OdayBackupSetting;

/**
 * Decides whether automatic (scheduled) backups should run for a company.
 */
final class BackupScheduleEligibility
{
    public static function hasActiveDestination(OdayBackupSetting $setting): bool
    {
        return (bool) $setting->drive_enabled || (bool) $setting->local_enabled;
    }

    /**
     * @return string|null Machine-readable skip reason, or null when scheduled backup may run.
     */
    public static function scheduledSkipReason(OdayBackupSetting $setting): ?string
    {
        if (! self::hasActiveDestination($setting)) {
            return 'no_destination_enabled';
        }

        if (! OdayBackupRequirements::encryptionKeyConfigured()) {
            return 'encryption_not_configured';
        }

        $frequency = strtolower(trim((string) $setting->frequency));
        if ($frequency !== 'daily' && $frequency !== 'weekly') {
            return 'schedule_not_configured';
        }

        if (! preg_match('/^\d{2}:\d{2}$/', trim((string) $setting->time_of_day))) {
            return 'schedule_not_configured';
        }

        if ($frequency === 'weekly') {
            $weekday = (int) ($setting->weekday ?? 1);
            if ($weekday < 1 || $weekday > 7) {
                return 'schedule_not_configured';
            }
        }

        return null;
    }

    public static function canRunScheduledBackup(OdayBackupSetting $setting): bool
    {
        return self::scheduledSkipReason($setting) === null;
    }
}
