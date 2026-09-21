<?php

/**
 * نظام عدي أبو ضحى — موظف المكتب لصرف الرواتب.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class OdayEmployee extends BaseModel
{
    use SoftDeletes;

    protected $table = 'oday_employees';

    protected $fillable = [
        'name',
        'job_title',
        'phone',
        'salary_amount',
        'currency_code',
        'hired_on',
        'notes',
        'is_active',
    ];

    protected $casts = [
        'salary_amount' => 'float',
        'is_active' => 'boolean',
        'is_deleted' => 'boolean',
        'updated_at' => 'timestamp',
        'created_at' => 'timestamp',
        'deleted_at' => 'timestamp',
    ];

    public function getEntityType()
    {
        return self::class;
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class)->withTrashed();
    }

    public function payments(): HasMany
    {
        return $this->hasMany(OdayPayrollPayment::class, 'employee_id');
    }
}
