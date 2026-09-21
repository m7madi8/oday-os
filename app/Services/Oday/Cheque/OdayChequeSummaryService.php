<?php

namespace App\Services\Oday\Cheque;

use App\Models\OdayCheque;
use App\Services\Oday\OdayChequeMoney;
use App\Services\Oday\OdayChequeStatusService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class OdayChequeSummaryService
{
    public function __construct(private OdayChequeStatusService $statuses)
    {
    }

    /**
     * @return array<string, mixed>
     */
    public function summarize(int $companyId, ?string $direction = null): array
    {
        $query = OdayCheque::query()
            ->where('company_id', $companyId)
            ->where('is_deleted', false);

        if ($direction && strtolower($direction) !== 'all') {
            $query->where('direction', $this->statuses->normalizeDirection($direction));
        }

        $rows = $query->get();
        $today = Carbon::today();
        $dueSoonEnd = $today->copy()->addDays(7);

        $buckets = [];

        foreach ($rows->groupBy(fn (OdayCheque $c) => strtoupper($c->currency_code ?: OdayChequeMoney::CURRENCY_ILS)) as $currency => $group) {
            $buckets[$currency] = $this->bucketCurrency($group, $currency, $today, $dueSoonEnd);
        }

        return [
            'direction' => $direction ? $this->statuses->normalizeDirection($direction) : 'all',
            'currencies' => $buckets,
        ];
    }

    /**
     * @param  Collection<int, OdayCheque>  $cheques
     * @return array<string, string|int>
     */
    private function bucketCurrency(Collection $cheques, string $currency, Carbon $today, Carbon $dueSoonEnd): array
    {
        $sumMinor = fn (callable $filter): int => (int) $cheques->filter($filter)->sum('amount_minor');

        $nonTerminal = fn (OdayCheque $c) => ! $this->statuses->isTerminal((string) $c->status);

        return [
            'currency' => $currency,
            'total' => OdayChequeMoney::minorToDecimal($sumMinor(fn () => true), $currency),
            'due_soon' => OdayChequeMoney::minorToDecimal($sumMinor(function (OdayCheque $c) use ($today, $dueSoonEnd, $nonTerminal) {
                if (! $nonTerminal($c) || ! $c->due_date) {
                    return false;
                }
                $due = Carbon::parse($c->due_date)->startOfDay();

                return $due->betweenIncluded($today, $dueSoonEnd);
            }), $currency),
            'processing' => OdayChequeMoney::minorToDecimal($sumMinor(fn (OdayCheque $c) => $c->status === OdayCheque::STATUS_PROCESSING), $currency),
            'cleared' => OdayChequeMoney::minorToDecimal($sumMinor(fn (OdayCheque $c) => $c->status === OdayCheque::STATUS_CLEARED), $currency),
            'returned' => OdayChequeMoney::minorToDecimal($sumMinor(fn (OdayCheque $c) => $c->status === OdayCheque::STATUS_RETURNED), $currency),
            'overdue' => OdayChequeMoney::minorToDecimal($sumMinor(fn (OdayCheque $c) => $this->statuses->isOverdue($c, $today)), $currency),
            'count' => $cheques->count(),
        ];
    }
}
