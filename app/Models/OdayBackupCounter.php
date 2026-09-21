<?php

namespace App\Models;

class OdayBackupCounter extends BaseModel
{
    protected $table = 'backup_counters';

    protected $fillable = [
        'company_id',
        'last_seq',
    ];
}
