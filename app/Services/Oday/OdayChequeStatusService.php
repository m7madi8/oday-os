<?php

/**
 * نظام عدي أبو ضحى — حالات الشيكات والانتقالات بينها.
 */

namespace App\Services\Oday;

use App\Models\OdayCheque;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class OdayChequeStatusService
{
    public function normalizeDirection(string $direction): string
    {
        return match (strtolower(trim($direction))) {
            'out', 'outgoing' => OdayCheque::DIRECTION_OUTGOING,
            default => OdayCheque::DIRECTION_INCOMING,
        };
    }

    public function initialStatus(string $direction): string
    {
        $direction = $this->normalizeDirection($direction);

        return $direction === OdayCheque::DIRECTION_OUTGOING
            ? OdayCheque::STATUS_DRAFT
            : OdayCheque::STATUS_RECEIVED;
    }

    /**
     * @return list<string>
     */
    public function statusesForDirection(string $direction): array
    {
        $direction = $this->normalizeDirection($direction);

        if ($direction === OdayCheque::DIRECTION_OUTGOING) {
            return [
                OdayCheque::STATUS_DRAFT,
                OdayCheque::STATUS_PRINTED,
                OdayCheque::STATUS_DELIVERED,
                OdayCheque::STATUS_CLEARED,
                OdayCheque::STATUS_RETURNED,
                OdayCheque::STATUS_CANCELLED,
            ];
        }

        return [
            OdayCheque::STATUS_RECEIVED,
            OdayCheque::STATUS_DEPOSITED,
            OdayCheque::STATUS_PROCESSING,
            OdayCheque::STATUS_CLEARED,
            OdayCheque::STATUS_RETURNED,
            OdayCheque::STATUS_CANCELLED,
        ];
    }

    public function isTerminal(string $status): bool
    {
        return in_array($status, [
            OdayCheque::STATUS_CLEARED,
            OdayCheque::STATUS_RETURNED,
            OdayCheque::STATUS_CANCELLED,
        ], true);
    }

    public function requiresReason(string $status): bool
    {
        return in_array($status, [
            OdayCheque::STATUS_RETURNED,
            OdayCheque::STATUS_CANCELLED,
        ], true);
    }

    public function canTransition(string $direction, string $from, string $to): bool
    {
        if ($from === $to) {
            return true;
        }

        if ($this->isTerminal($from)) {
            return false;
        }

        $direction = $this->normalizeDirection($direction);
        $allowed = $this->allowedTargets($direction, $from);

        return in_array($to, $allowed, true);
    }

    /**
     * @return list<string>
     */
    private function allowedTargets(string $direction, string $from): array
    {
        if ($direction === OdayCheque::DIRECTION_OUTGOING) {
            return match ($from) {
                OdayCheque::STATUS_DRAFT => [
                    OdayCheque::STATUS_PRINTED,
                    OdayCheque::STATUS_CANCELLED,
                ],
                OdayCheque::STATUS_PRINTED => [
                    OdayCheque::STATUS_DELIVERED,
                    OdayCheque::STATUS_CANCELLED,
                ],
                OdayCheque::STATUS_DELIVERED => [
                    OdayCheque::STATUS_CLEARED,
                    OdayCheque::STATUS_RETURNED,
                    OdayCheque::STATUS_CANCELLED,
                ],
                default => [],
            };
        }

        return match ($from) {
            OdayCheque::STATUS_RECEIVED => [
                OdayCheque::STATUS_DEPOSITED,
                OdayCheque::STATUS_CANCELLED,
            ],
            OdayCheque::STATUS_DEPOSITED => [
                OdayCheque::STATUS_PROCESSING,
                OdayCheque::STATUS_CANCELLED,
            ],
            OdayCheque::STATUS_PROCESSING => [
                OdayCheque::STATUS_CLEARED,
                OdayCheque::STATUS_RETURNED,
                OdayCheque::STATUS_CANCELLED,
            ],
            default => [],
        };
    }

    public function assertTransition(OdayCheque $cheque, string $nextStatus): void
    {
        $current = (string) $cheque->status;

        if ($current === $nextStatus) {
            return;
        }

        if (! $this->canTransition($cheque->direction, $current, $nextStatus)) {
            throw ValidationException::withMessages([
                'status' => ['انتقال الحالة غير مسموح من '.$current.' إلى '.$nextStatus],
            ]);
        }
    }

    public function assertReason(string $status, ?string $reason): void
    {
        if (! $this->requiresReason($status)) {
            return;
        }

        if (trim((string) $reason) === '') {
            throw ValidationException::withMessages([
                'reason' => ['سبب الحالة مطلوب للشيكات الملغاة أو المرتجعة'],
            ]);
        }
    }

    public function isOverdue(OdayCheque $cheque, ?Carbon $today = null): bool
    {
        if ($this->isTerminal((string) $cheque->status)) {
            return false;
        }

        if ($cheque->direction === OdayCheque::DIRECTION_OUTGOING && $cheque->status === OdayCheque::STATUS_DRAFT) {
            return false;
        }

        if (! $cheque->due_date) {
            return false;
        }

        $today = $today ?: Carbon::today();

        return Carbon::parse($cheque->due_date)->startOfDay()->lt($today);
    }
}
