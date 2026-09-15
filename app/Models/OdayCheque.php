<?php

/**
 * نظام عدي أبو ضحى — سجل الشيكات المكتبية.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $company_id
 * @property int $user_id
 * @property int|null $assigned_user_id
 * @property int|null $client_id
 * @property int|null $invoice_id
 * @property int|null $payment_id
 * @property string $direction
 * @property string $number
 * @property string|null $bank_name
 * @property float $amount
 * @property string|null $due_date
 * @property string $status
 * @property string|null $notes
 * @property bool $is_deleted
 */
class OdayCheque extends BaseModel
{
    use SoftDeletes;

    public const DIRECTION_IN = 'in';
    public const DIRECTION_OUT = 'out';

    public const STATUS_PENDING = 'pending';
    public const STATUS_DEPOSITED = 'deposited';
    public const STATUS_CLEARED = 'cleared';
    public const STATUS_BOUNCED = 'bounced';
    public const STATUS_CANCELLED = 'cancelled';

    protected $table = 'oday_cheques';

    protected $fillable = [
        'client_id',
        'invoice_id',
        'payment_id',
        'assigned_user_id',
        'direction',
        'number',
        'bank_name',
        'amount',
        'due_date',
        'status',
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

    public function company(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function user(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class)->withTrashed();
    }

    public function client(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Client::class)->withTrashed();
    }

    public function invoice(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Invoice::class)->withTrashed();
    }

    public function payment(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Payment::class)->withTrashed();
    }

    public static function statuses(): array
    {
        return [
            self::STATUS_PENDING,
            self::STATUS_DEPOSITED,
            self::STATUS_CLEARED,
            self::STATUS_BOUNCED,
            self::STATUS_CANCELLED,
        ];
    }
}
