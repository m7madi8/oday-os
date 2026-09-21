<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OdayOfficeBankLogo extends Model
{
    protected $table = 'oday_office_bank_logos';

    protected $fillable = [
        'company_id',
        'bank_id',
        'document_id',
    ];

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }
}
