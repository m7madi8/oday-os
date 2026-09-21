<?php

namespace App\Services\Oday\Backup;

use App\Models\OdayBackupCounter;
use Illuminate\Support\Facades\DB;

final class BackupSequenceAllocator
{
    public function next(int $companyId): int
    {
        return (int) DB::transaction(function () use ($companyId) {
            $row = OdayBackupCounter::query()
                ->where('company_id', $companyId)
                ->lockForUpdate()
                ->first();

            if (! $row) {
                $row = OdayBackupCounter::query()->create([
                    'company_id' => $companyId,
                    'last_seq' => 0,
                ]);
                $row = OdayBackupCounter::query()->where('company_id', $companyId)->lockForUpdate()->first();
            }

            $next = ((int) $row->last_seq) + 1;
            $row->last_seq = $next;
            $row->save();

            return $next;
        });
    }
}
