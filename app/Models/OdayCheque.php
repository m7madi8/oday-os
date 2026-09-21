<?php

/**
 * نظام عدي أبو ضحى — سجل الشيكات المكتبية.
 */

namespace App\Models;

use App\Services\Oday\OdayChequeMoney;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $company_id
 * @property int $user_id
 * @property int|null $updated_by_user_id
 * @property int|null $assigned_user_id
 * @property int|null $client_id
 * @property int|null $project_id
 * @property int|null $vendor_id
 * @property string|null $payee_name
 * @property string|null $drawer_name
 * @property string|null $account_reference
 * @property string|null $dedupe_key
 * @property int|null $invoice_id
 * @property int|null $payment_id
 * @property int|null $scan_document_id
 * @property string $direction
 * @property string $number
 * @property string|null $bank_id
 * @property string|null $bank_name
 * @property int $amount_minor
 * @property string $amount
 * @property string $currency_code
 * @property string|null $issue_date
 * @property string|null $due_date
 * @property string $status
 * @property string|null $status_reason
 * @property string|null $notes
 * @property bool $is_deleted
 */
class OdayCheque extends BaseModel
{
    use SoftDeletes;

    public const DIRECTION_INCOMING = 'incoming';
    public const DIRECTION_OUTGOING = 'outgoing';

    /** @deprecated */
    public const DIRECTION_IN = self::DIRECTION_INCOMING;

    /** @deprecated */
    public const DIRECTION_OUT = self::DIRECTION_OUTGOING;

    public const STATUS_RECEIVED = 'received';
    public const STATUS_DEPOSITED = 'deposited';
    public const STATUS_PROCESSING = 'processing';
    public const STATUS_DRAFT = 'draft';
    public const STATUS_PRINTED = 'printed';
    public const STATUS_DELIVERED = 'delivered';
    public const STATUS_CLEARED = 'cleared';
    public const STATUS_RETURNED = 'returned';
    public const STATUS_CANCELLED = 'cancelled';

    /** @deprecated Use STATUS_RECEIVED */
    public const STATUS_PENDING = self::STATUS_RECEIVED;

    /** @deprecated Use STATUS_RETURNED */
    public const STATUS_BOUNCED = self::STATUS_RETURNED;

    protected $table = 'oday_cheques';

    protected $fillable = [
        'client_id',
        'project_id',
        'vendor_id',
        'payee_name',
        'drawer_name',
        'account_reference',
        'dedupe_key',
        'invoice_id',
        'payment_id',
        'scan_document_id',
        'assigned_user_id',
        'updated_by_user_id',
        'direction',
        'number',
        'bank_id',
        'bank_name',
        'amount',
        'amount_minor',
        'currency_code',
        'issue_date',
        'due_date',
        'status',
        'status_reason',
        'notes',
    ];

    protected $casts = [
        'amount_minor' => 'integer',
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

    public function updatedBy(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by_user_id')->withTrashed();
    }

    public function client(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Client::class)->withTrashed();
    }

    public function project(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Project::class)->withTrashed();
    }

    public function vendor(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Vendor::class)->withTrashed();
    }

    public function invoice(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Invoice::class)->withTrashed();
    }

    public function payment(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Payment::class)->withTrashed();
    }

    public function scanDocument(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Document::class, 'scan_document_id');
    }

    public function statusHistories(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(OdayChequeStatusHistory::class, 'cheque_id')->orderBy('created_at');
    }

    public function amountForApi(): string
    {
        $currency = $this->currency_code ?: OdayChequeMoney::CURRENCY_ILS;

        if ($this->amount_minor > 0) {
            return OdayChequeMoney::formatStoredMinor((int) $this->amount_minor, $currency);
        }

        return OdayChequeMoney::formatStored($this->amount, $currency);
    }

    /**
     * @return list<string>
     */
    public static function statuses(): array
    {
        return [
            self::STATUS_RECEIVED,
            self::STATUS_DEPOSITED,
            self::STATUS_PROCESSING,
            self::STATUS_DRAFT,
            self::STATUS_PRINTED,
            self::STATUS_DELIVERED,
            self::STATUS_CLEARED,
            self::STATUS_RETURNED,
            self::STATUS_CANCELLED,
        ];
    }
}
