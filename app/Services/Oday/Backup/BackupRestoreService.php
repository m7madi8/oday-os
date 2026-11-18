<?php

namespace App\Services\Oday\Backup;

/**
 * ODAY backup restore is refused.
 *
 * The previous implementation decrypted an archive and executed database.sql
 * via DB::unprepared() after SET FOREIGN_KEY_CHECKS=0. That dump is a full
 * mysqldump of the MySQL database, not a company-scoped dataset. A company id
 * in manifest.json did not limit which rows the SQL replaced.
 *
 * Creation, download, and scheduling do not use this class.
 */
final class BackupRestoreService
{
    public function restoreFromRun(int $companyId, int $runId): void
    {
        unset($companyId, $runId);

        throw new BackupRestoreUnavailable();
    }
}
