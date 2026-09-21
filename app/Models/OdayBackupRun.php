<?php

namespace App\Models;

class OdayBackupRun extends BaseModel
{
    public const STATUS_RUNNING = 'running';
    public const STATUS_SUCCESS = 'success';
    public const STATUS_PARTIAL = 'partial';
    public const STATUS_FAILED = 'failed';

    public const TYPE_AUTO = 'auto';
    public const TYPE_MANUAL = 'manual';

    protected $table = 'backup_runs';

    protected $fillable = [
        'company_id',
        'seq',
        'file_name',
        'type',
        'started_at',
        'finished_at',
        'size_bytes',
        'checksum_sha256',
        'status',
        'drive_status',
        'drive_file_id',
        'drive_error',
        'local_status',
        'local_error',
        'error_message',
        'storage_path',
        'retry_count',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
    ];
}
