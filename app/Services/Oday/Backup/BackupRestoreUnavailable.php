<?php

namespace App\Services\Oday\Backup;

use RuntimeException;

/**
 * Raised when ODAY refuses to replay a backup archive.
 * The previous restore path executed a full mysqldump with foreign keys disabled.
 */
final class BackupRestoreUnavailable extends RuntimeException
{
    public const CODE = 'restore_disabled';

    public function __construct()
    {
        parent::__construct(self::CODE);
    }
}
