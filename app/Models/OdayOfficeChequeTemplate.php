<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OdayOfficeChequeTemplate extends Model
{
    protected $table = 'oday_office_cheque_templates';

    protected $casts = [
        'fields_json' => 'array',
        'verified_at' => 'datetime',
        'width_mm' => 'float',
        'height_mm' => 'float',
    ];

    protected $fillable = [
        'company_id',
        'bank_id',
        'mode',
        'width_mm',
        'height_mm',
        'fields_json',
        'scan_document_id',
        'verified_at',
        'verified_by_user_id',
    ];

    public function scanDocument(): BelongsTo
    {
        return $this->belongsTo(Document::class, 'scan_document_id');
    }
}
