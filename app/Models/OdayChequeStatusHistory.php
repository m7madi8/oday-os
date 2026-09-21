<?php

namespace App\Models;

/**
 * @property int $id
 * @property int $cheque_id
 * @property string|null $old_status
 * @property string $new_status
 * @property string|null $reason
 * @property int $user_id
 * @property string $created_at
 */
class OdayChequeStatusHistory extends BaseModel
{
    public $timestamps = false;

    protected $table = 'oday_cheque_status_histories';

    protected $fillable = [
        'cheque_id',
        'old_status',
        'new_status',
        'reason',
        'user_id',
        'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function cheque(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(OdayCheque::class, 'cheque_id');
    }

    public function user(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class)->withTrashed();
    }
}
