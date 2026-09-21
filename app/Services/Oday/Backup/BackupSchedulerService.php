<?php

namespace App\Services\Oday\Backup;

use App\Models\OdayBackupRun;
use App\Models\OdayBackupSetting;
use Illuminate\Support\Carbon;

final class BackupSchedulerService
{
    public function __construct(private BackupEngine $engine) {}

    public function runDueBackups(): int
    {
        $count = 0;
        OdayBackupSetting::query()->chunkById(50, function ($settings) use (&$count) {
            foreach ($settings as $setting) {
                if ($this->isDue($setting)) {
                    try {
                        $this->engine->run((int) $setting->company_id, OdayBackupRun::TYPE_AUTO);
                        $setting->last_scheduled_at = now();
                        $setting->save();
                        $count++;
                    } catch (\Throwable) {
                        /* logged by engine */
                    }
                }
            }
        });

        return $count;
    }

    public function isDue(OdayBackupSetting $setting): bool
    {
        $tz = $setting->timezone ?: 'UTC';
        $now = Carbon::now($tz);
        [$hour, $minute] = array_pad(explode(':', (string) $setting->time_of_day), 2, '0');
        $scheduled = $now->copy()->setTime((int) $hour, (int) $minute, 0);

        if ($setting->frequency === 'weekly') {
            $weekday = (int) ($setting->weekday ?? 1);
            if ($now->dayOfWeekIso !== $weekday) {
                return false;
            }
        }

        if ($now->lt($scheduled)) {
            return false;
        }

        $last = $setting->last_scheduled_at?->timezone($tz);
        if ($last && $last->isSameDay($now) && $setting->frequency === 'daily') {
            return false;
        }
        if ($last && $last->greaterThanOrEqualTo($scheduled) && $setting->frequency === 'weekly') {
            return false;
        }

        return true;
    }
}
