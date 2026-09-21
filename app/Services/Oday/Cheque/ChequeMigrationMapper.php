<?php

namespace App\Services\Oday\Cheque;

use App\Models\OdayCheque;

class ChequeMigrationMapper
{
    /**
     * @param  list<string>  $unmapped
     */
    public function mapDirection(string $value, array &$unmapped): string
    {
        $normalized = strtolower(trim($value));

        return match ($normalized) {
            'in', 'incoming', '' => OdayCheque::DIRECTION_INCOMING,
            'out', 'outgoing' => OdayCheque::DIRECTION_OUTGOING,
            default => $this->recordUnmapped($value, $unmapped, OdayCheque::DIRECTION_INCOMING),
        };
    }

    /**
     * @param  list<string>  $unmapped
     */
    public function mapStatus(string $value, string $direction, array &$unmapped): string
    {
        $normalized = strtolower(trim($value));

        $mapped = match ($normalized) {
            'pending', 'received' => OdayCheque::STATUS_RECEIVED,
            'deposited' => OdayCheque::STATUS_DEPOSITED,
            'processing' => OdayCheque::STATUS_PROCESSING,
            'draft' => OdayCheque::STATUS_DRAFT,
            'printed' => OdayCheque::STATUS_PRINTED,
            'delivered' => OdayCheque::STATUS_DELIVERED,
            'cleared' => OdayCheque::STATUS_CLEARED,
            'bounced', 'returned' => OdayCheque::STATUS_RETURNED,
            'cancelled' => OdayCheque::STATUS_CANCELLED,
            default => null,
        };

        if ($mapped === null) {
            return $this->recordUnmapped($value, $unmapped, $this->fallbackStatus($direction));
        }

        if ($direction === OdayCheque::DIRECTION_OUTGOING && $mapped === OdayCheque::STATUS_RECEIVED) {
            return OdayCheque::STATUS_DRAFT;
        }

        return $mapped;
    }

    public static function buildDedupeKey(?string $bankId, ?string $bankName, ?string $accountReference, string $number): string
    {
        $bank = trim((string) ($bankId ?: $bankName ?: ''));
        $account = trim((string) ($accountReference ?? ''));
        $number = trim($number);

        return hash('sha256', $bank.'|'.$account.'|'.$number);
    }

    private function fallbackStatus(string $direction): string
    {
        return $direction === OdayCheque::DIRECTION_OUTGOING
            ? OdayCheque::STATUS_DRAFT
            : OdayCheque::STATUS_RECEIVED;
    }

    /**
     * @param  list<string>  $unmapped
     */
    private function recordUnmapped(string $value, array &$unmapped, string $fallback): string
    {
        $unmapped[] = $value;

        return $fallback;
    }
}
