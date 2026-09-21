<?php

namespace App\Models;

class OdayBackupSetting extends BaseModel
{
    protected $table = 'backup_settings';

    protected $fillable = [
        'company_id',
        'google_refresh_token_encrypted',
        'google_account_email',
        'drive_folder_id',
        'drive_enabled',
        'local_enabled',
        'local_folder_path',
        'local_folder_label',
        'local_mode',
        'frequency',
        'time_of_day',
        'weekday',
        'timezone',
        'retention_count_drive',
        'retention_count_local',
        'last_success_at',
        'last_scheduled_at',
    ];

    protected $casts = [
        'drive_enabled' => 'boolean',
        'local_enabled' => 'boolean',
        'last_success_at' => 'datetime',
        'last_scheduled_at' => 'datetime',
    ];
}
