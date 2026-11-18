<?php

namespace App\Services\Oday\Backup;

use App\Models\OdayBackupRun;

interface BackupRunner
{
    public function run(int $companyId, string $type = OdayBackupRun::TYPE_MANUAL): OdayBackupRun;
}
