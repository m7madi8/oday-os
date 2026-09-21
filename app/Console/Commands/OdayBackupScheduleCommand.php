<?php

namespace App\Console\Commands;

use App\Services\Oday\Backup\BackupSchedulerService;
use Illuminate\Console\Command;

class OdayBackupScheduleCommand extends Command
{
    protected $signature = 'oday:backup-run-scheduled';

    protected $description = 'Run due ODAY OS automatic backups';

    public function handle(BackupSchedulerService $scheduler): int
    {
        $count = $scheduler->runDueBackups();
        $this->info('Started '.$count.' backup(s).');

        return self::SUCCESS;
    }
}
