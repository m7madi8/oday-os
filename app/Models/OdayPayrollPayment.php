<?php

/**
 * نظام عدي أبو ضحى — صرف راتب موظف.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class OdayPayrollPayment extends BaseModel
{
    use SoftDeletes;

    public const METHOD_CASH = 'cash';
    public const METHOD_TRANSFER = 'transfer';
    public const METHOD_CHEQUE = 'cheque';

    protected $table = 'oday_payroll_payments';

    protected $fillable = [
        'employee_id',
        'expense_id',
        'amount',
        'currency_code',
        'period',
        'paid_on',
        'method',
        'notes',
    ];

    protected $casts = [
        'amount' => 'float',
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

    public function employee(): BelongsTo
    {
        return $this->belongsTo(OdayEmployee::class, 'employee_id')->withTrashed();
    }

    public function expense(): BelongsTo
    {
        return $this->belongsTo(Expense::class)->withTrashed();
    }

    /**
     * @return list<string>
     */
    public static function methods(): array
    {
        return [
            self::METHOD_CASH,
            self::METHOD_TRANSFER,
            self::METHOD_CHEQUE,
        ];
    }
}
