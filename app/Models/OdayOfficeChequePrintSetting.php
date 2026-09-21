<?php

namespace App\Models;

/**
 * @property int $id
 * @property int $company_id
 * @property string $offset_x_mm
 * @property string $offset_y_mm
 */
class OdayOfficeChequePrintSetting extends BaseModel
{
    protected $table = 'oday_office_cheque_print_settings';

    protected $fillable = [
        'company_id',
        'offset_x_mm',
        'offset_y_mm',
    ];

    protected $casts = [
        'updated_at' => 'timestamp',
        'created_at' => 'timestamp',
    ];
}
