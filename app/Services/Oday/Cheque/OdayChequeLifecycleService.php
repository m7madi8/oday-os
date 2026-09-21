<?php

namespace App\Services\Oday\Cheque;

use App\Models\OdayCheque;
use App\Models\OdayChequeStatusHistory;
use App\Models\User;
use Illuminate\Support\Carbon;

class OdayChequeLifecycleService
{
    public function recordCreation(OdayCheque $cheque, User $user): void
    {
        $this->write($cheque, null, (string) $cheque->status, null, $user);
    }

    public function recordTransition(OdayCheque $cheque, ?string $oldStatus, string $newStatus, ?string $reason, User $user): void
    {
        $this->write($cheque, $oldStatus, $newStatus, $reason, $user);
    }

    private function write(OdayCheque $cheque, ?string $oldStatus, string $newStatus, ?string $reason, User $user): void
    {
        OdayChequeStatusHistory::query()->create([
            'cheque_id' => $cheque->id,
            'old_status' => $oldStatus,
            'new_status' => $newStatus,
            'reason' => $reason,
            'user_id' => $user->id,
            'created_at' => Carbon::now(),
        ]);
    }
}
