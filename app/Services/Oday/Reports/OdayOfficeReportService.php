<?php

namespace App\Services\Oday\Reports;

use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;

/**
 * Aggregates the existing office report.
 *
 * Income is the sum of non-deleted recognized payments in the selected dates.
 * Recognized statuses match Invoice Ninja payment balance handling:
 * pending, completed, partially refunded, and refunded. The summed
 * figure is amount minus refunded. Cancelled and failed payments are excluded.
 * Expenses are the sum of non-deleted expense amounts in the same dates.
 * Open receivables are invoice balances with status other than cancelled,
 * independent of the selected month, matching the previous screen.
 * Amounts are never added across currency_id values.
 */
class OdayOfficeReportService
{
    /**
     * @return array<string, mixed>
     */
    public function summarize(int $companyId, int $year, ?int $month): array
    {
        $yearStart = sprintf('%04d-01-01', $year);
        $yearEnd = sprintf('%04d-12-31', $year);
        $periodStart = $yearStart;
        $periodEnd = $yearEnd;

        if ($month !== null) {
            $periodStart = sprintf('%04d-%02d-01', $year, $month);
            $periodEnd = date('Y-m-t', strtotime($periodStart));
        }

        $periodIncome = $this->groupedAmount('payments', $companyId, 'date', $periodStart, $periodEnd);
        $periodExpenses = $this->groupedAmount('expenses', $companyId, 'expense_date', $periodStart, $periodEnd);
        $yearIncome = $this->groupedAmount('payments', $companyId, 'date', $yearStart, $yearEnd);
        $yearExpenses = $this->groupedAmount('expenses', $companyId, 'expense_date', $yearStart, $yearEnd);
        $income = $this->present($periodIncome);
        $expenses = $this->present($periodExpenses);
        $net = $this->present($this->netBuckets($periodIncome, $periodExpenses));
        $yearIncomePresent = $this->present($yearIncome);
        $activeMonths = $this->activeMonths($companyId, $yearStart, $yearEnd);
        $average = $this->average($yearIncomePresent, count($activeMonths));
        $open = $this->openReceivables($companyId);

        return [
            'income' => $income['amount'],
            'incomeLabel' => $income['label'],
            'expenses' => $expenses['amount'],
            'expensesLabel' => $expenses['label'],
            'netProfit' => $net['amount'],
            'netProfitLabel' => $net['label'],
            'netNegative' => $net['negative'],
            'currencyCode' => $income['code'],
            'mixed' => $income['mixed'] || $expenses['mixed'] || $net['mixed'],
            'openReceivables' => $open['total'],
            'openReceivablesLabel' => $open['label'],
            'openInvoiceCount' => $open['count'],
            'activeMonths' => count($activeMonths),
            'avgMonthlyIncome' => $average['amount'],
            'avgMonthlyIncomeLabel' => $average['label'],
            'yearProjectCount' => $this->countBetween('projects', $companyId, 'created_at', $yearStart.' 00:00:00', $yearEnd.' 23:59:59'),
            'yearInvoiceCount' => $this->countBetween('invoices', $companyId, 'date', $yearStart, $yearEnd),
            'monthlySeries' => $this->monthlySeries($companyId, $year),
            'clientRows' => $this->clientRows($companyId, $yearStart, $yearEnd),
            'openInvoices' => $open['rows'],
            'projectProfitRows' => $this->projectRows($companyId, $yearStart, $yearEnd),
        ];
    }

    /**
     * @return array<int, string>
     */
    private function groupedAmount(string $table, int $companyId, string $dateMode, string $start, string $end): array
    {
        $query = DB::table($table)
            ->where('company_id', $companyId)
            ->where('is_deleted', 0)
            ->whereNull('deleted_at');

        $this->whereRecognizedPayments($query, $table);
        $this->whereDate($query, $table, $dateMode, $start, $end);

        $sum = $table === 'payments' ? 'SUM(amount - refunded)' : 'SUM(amount)';
        $rows = $query
            ->select('currency_id', DB::raw($sum.' as total'))
            ->groupBy('currency_id')
            ->get();

        $buckets = [];
        foreach ($rows as $row) {
            $buckets[(int) ($row->currency_id ?? 0)] = $this->normalize((string) $row->total);
        }

        return $buckets;
    }

    private function whereDate($query, string $table, string $dateMode, string $start, string $end): void
    {
        if ($dateMode === 'expense_date') {
            $query->where(function ($inner) use ($start, $end) {
                $inner->whereBetween('date', [$start, $end])
                    ->orWhere(function ($fallback) use ($start, $end) {
                        $fallback->whereNull('date')->whereBetween('payment_date', [$start, $end]);
                    });
            });

            return;
        }

        $query->whereBetween('date', [$start, $end]);
        unset($table);
    }

    private function whereRecognizedPayments($query, string $table): void
    {
        if ($table !== 'payments') {
            return;
        }

        $query->whereIn('status_id', [
            Payment::STATUS_PENDING,
            Payment::STATUS_COMPLETED,
            Payment::STATUS_PARTIALLY_REFUNDED,
            Payment::STATUS_REFUNDED,
        ]);
    }

    /**
     * @param  array<int, string>  $income
     * @param  array<int, string>  $expenses
     * @return array<int, string>
     */
    private function netBuckets(array $income, array $expenses): array
    {
        $keys = array_unique(array_merge(array_keys($income), array_keys($expenses)));
        $net = [];
        foreach ($keys as $key) {
            $net[(int) $key] = bcsub($income[$key] ?? '0', $expenses[$key] ?? '0', 6);
        }

        return $net;
    }

    /**
     * @param  array<int, string>  $buckets
     * @return array{amount: ?string, label: ?string, mixed: bool, negative: bool, code: ?string}
     */
    private function present(array $buckets): array
    {
        $nonzero = [];
        foreach ($buckets as $currencyId => $amount) {
            if (bccomp($this->normalize($amount), '0', 6) !== 0) {
                $nonzero[(int) $currencyId] = $this->normalize($amount);
            }
        }

        if (count($nonzero) > 1) {
            $parts = [];
            foreach ($nonzero as $currencyId => $amount) {
                $parts[] = $this->formatAmount($amount).' '.$this->currencyCode($currencyId);
            }

            return [
                'amount' => null,
                'label' => implode(' · ', $parts),
                'mixed' => true,
                'negative' => false,
                'code' => null,
            ];
        }

        if ($nonzero === []) {
            return [
                'amount' => '0.00',
                'label' => null,
                'mixed' => false,
                'negative' => false,
                'code' => null,
            ];
        }

        $currencyId = (int) array_key_first($nonzero);
        $amount = $nonzero[$currencyId];

        return [
            'amount' => $this->formatAmount($amount),
            'label' => null,
            'mixed' => false,
            'negative' => bccomp($amount, '0', 6) < 0,
            'code' => $this->currencyCode($currencyId),
        ];
    }

    /**
     * @param  array{amount: ?string, label: ?string, mixed: bool}  $yearIncome
     * @return array{amount: ?string, label: ?string}
     */
    private function average(array $yearIncome, int $months): array
    {
        if ($yearIncome['mixed']) {
            return ['amount' => null, 'label' => $yearIncome['label']];
        }

        if ($months < 1) {
            return ['amount' => '0.00', 'label' => null];
        }

        return [
            'amount' => $this->formatAmount(bcdiv($this->normalize((string) $yearIncome['amount']), (string) $months, 6)),
            'label' => null,
        ];
    }

    /**
     * @return list<int>
     */
    private function activeMonths(int $companyId, string $start, string $end): array
    {
        $months = [];
        foreach (['payments' => 'date', 'expenses' => 'expense_date'] as $table => $mode) {
            $query = DB::table($table)
                ->where('company_id', $companyId)
                ->where('is_deleted', 0)
                ->whereNull('deleted_at');
            $this->whereRecognizedPayments($query, $table);
            $this->whereDate($query, $table, $mode, $start, $end);
            $column = $table === 'expenses' ? 'COALESCE(date, payment_date)' : 'date';
            $rows = $query->selectRaw('substr('.$column.', 6, 2) as month_number')->distinct()->get();
            foreach ($rows as $row) {
                $month = (int) $row->month_number;
                if ($month >= 1 && $month <= 12) {
                    $months[$month] = true;
                }
            }
        }

        $keys = array_keys($months);
        sort($keys);

        return $keys;
    }

    /**
     * @return array{total: string, count: int, rows: list<array<string, mixed>>}
     */
    private function openReceivables(int $companyId): array
    {
        $currencySql = "COALESCE(NULLIF(CAST(JSON_UNQUOTE(JSON_EXTRACT(clients.settings, '$.currency_id')) AS UNSIGNED), 0), NULLIF(CAST(JSON_UNQUOTE(JSON_EXTRACT(companies.settings, '$.currency_id')) AS UNSIGNED), 0), 0)";
        $base = DB::table('invoices')
            ->join('clients', 'clients.id', '=', 'invoices.client_id')
            ->join('companies', 'companies.id', '=', 'invoices.company_id')
            ->where('invoices.company_id', $companyId)
            ->where('invoices.is_deleted', 0)
            ->whereNull('invoices.deleted_at')
            ->where('invoices.status_id', '!=', Invoice::STATUS_CANCELLED)
            ->where('invoices.balance', '>', 0);

        $grouped = (clone $base)
            ->selectRaw($currencySql.' as currency_id, SUM(invoices.balance) as total')
            ->groupByRaw($currencySql)
            ->get();
        $buckets = [];
        foreach ($grouped as $row) {
            $buckets[(int) $row->currency_id] = $this->normalize((string) $row->total);
        }
        $presented = $this->present($buckets);
        $rows = (clone $base)
            ->select('invoices.id', 'invoices.client_id', 'invoices.number', 'invoices.balance', 'invoices.due_date')
            ->selectRaw($currencySql.' as currency_id')
            ->orderByDesc('invoices.balance')
            ->limit(8)
            ->get();

        $names = DB::table('clients')
            ->whereIn('id', $rows->pluck('client_id')->filter()->all() ?: [0])
            ->pluck('name', 'id');

        return [
            'total' => $presented['amount'],
            'label' => $presented['label'],
            'count' => (int) (clone $base)->count(),
            'rows' => $rows->map(function ($row) use ($names, $presented) {
                $balance = $this->formatAmount($this->normalize((string) $row->balance));

                return [
                    'id' => $row->id,
                    'number' => $row->number ?: '—',
                    'clientName' => $names[$row->client_id] ?? '—',
                    'balance' => $balance,
                    'balanceLabel' => $presented['mixed'] ? $balance.' '.$this->currencyCode((int) $row->currency_id) : null,
                    'dueDate' => $row->due_date ?: '—',
                ];
            })->all(),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function monthlySeries(int $companyId, int $year): array
    {
        $series = [];
        for ($month = 1; $month <= 12; $month++) {
            $start = sprintf('%04d-%02d-01', $year, $month);
            $end = date('Y-m-t', strtotime($start));
            $incomeBuckets = $this->groupedAmount('payments', $companyId, 'date', $start, $end);
            $expenseBuckets = $this->groupedAmount('expenses', $companyId, 'expense_date', $start, $end);
            $income = $this->present($incomeBuckets);
            $expenses = $this->present($expenseBuckets);
            $net = $this->present($this->netBuckets($incomeBuckets, $expenseBuckets));
            $series[] = [
                'month' => $month,
                'income' => $income['amount'],
                'incomeLabel' => $income['label'],
                'expenses' => $expenses['amount'],
                'expensesLabel' => $expenses['label'],
                'profit' => $net['amount'],
                'profitLabel' => $net['label'],
                'profitNegative' => $net['negative'],
            ];
        }

        return $series;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function clientRows(int $companyId, string $start, string $end): array
    {
        $payments = DB::table('payments')
            ->where('company_id', $companyId)
            ->where('is_deleted', 0)
            ->whereNull('deleted_at')
            ->whereBetween('date', [$start, $end])
            ->whereIn('status_id', [
                Payment::STATUS_PENDING,
                Payment::STATUS_COMPLETED,
                Payment::STATUS_PARTIALLY_REFUNDED,
                Payment::STATUS_REFUNDED,
            ])
            ->whereNotNull('client_id')
            ->select('client_id', 'currency_id', DB::raw('SUM(amount - refunded) as total'))
            ->groupBy('client_id', 'currency_id')
            ->get();

        $projects = DB::table('projects')
            ->where('company_id', $companyId)
            ->where('is_deleted', 0)
            ->whereNull('deleted_at')
            ->whereBetween('created_at', [$start.' 00:00:00', $end.' 23:59:59'])
            ->whereNotNull('client_id')
            ->select('client_id', DB::raw('COUNT(*) as aggregate_count'))
            ->groupBy('client_id')
            ->get();

        $byClient = [];
        foreach ($payments as $row) {
            $byClient[(int) $row->client_id]['income'][(int) ($row->currency_id ?? 0)] = $this->normalize((string) $row->total);
        }
        foreach ($projects as $row) {
            $byClient[(int) $row->client_id]['projects'] = (int) $row->aggregate_count;
        }

        if ($byClient === []) {
            return [];
        }

        $names = DB::table('clients')->whereIn('id', array_keys($byClient))->pluck('name', 'id');
        $rows = [];
        foreach ($byClient as $clientId => $data) {
            $presented = $this->present($data['income'] ?? []);
            $projectCount = $data['projects'] ?? 0;
            if ($presented['amount'] === '0.00' && $presented['label'] === null && $projectCount === 0) {
                continue;
            }
            $rows[] = [
                'id' => $clientId,
                'name' => $names[$clientId] ?? '—',
                'projectCount' => $projectCount,
                'income' => $presented['amount'],
                'incomeLabel' => $presented['label'],
            ];
        }

        usort($rows, function (array $left, array $right): int {
            if ($left['incomeLabel'] || $right['incomeLabel'] || ! is_numeric((string) $left['income']) || ! is_numeric((string) $right['income'])) {
                return $right['projectCount'] <=> $left['projectCount'];
            }

            $money = bccomp((string) $right['income'], (string) $left['income'], 6);
            if ($money !== 0) {
                return $money;
            }

            return $right['projectCount'] <=> $left['projectCount'];
        });

        return $rows;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function projectRows(int $companyId, string $start, string $end): array
    {
        $payments = $this->groupedByProject('payments', $companyId, 'date', $start, $end);
        $expenses = $this->groupedByProject('expenses', $companyId, 'expense_date', $start, $end);
        $ids = array_unique(array_merge(array_keys($payments), array_keys($expenses)));
        if ($ids === []) {
            return [];
        }

        $projects = DB::table('projects')->whereIn('id', $ids)->get(['id', 'name', 'custom_value1'])->keyBy('id');
        $rows = [];
        foreach ($ids as $projectId) {
            $net = $this->present($this->netBuckets($payments[$projectId] ?? [], $expenses[$projectId] ?? []));
            $rows[] = [
                'id' => $projectId,
                'name' => $projects[$projectId]->name ?? '—',
                'type' => $projects[$projectId]->custom_value1 ?? '—',
                'profit' => $net['amount'],
                'profitLabel' => $net['label'],
                'profitNegative' => $net['negative'],
            ];
        }

        return $rows;
    }

    /**
     * @return array<int, array<int, string>>
     */
    private function groupedByProject(string $table, int $companyId, string $dateMode, string $start, string $end): array
    {
        $query = DB::table($table)
            ->where('company_id', $companyId)
            ->where('is_deleted', 0)
            ->whereNull('deleted_at')
            ->whereNotNull('project_id')
            ->where('project_id', '!=', 0);
        $this->whereRecognizedPayments($query, $table);
        $this->whereDate($query, $table, $dateMode, $start, $end);

        $sum = $table === 'payments' ? 'SUM(amount - refunded)' : 'SUM(amount)';
        $grouped = [];
        foreach ($query->select('project_id', 'currency_id', DB::raw($sum.' as total'))->groupBy('project_id', 'currency_id')->get() as $row) {
            $grouped[(int) $row->project_id][(int) ($row->currency_id ?? 0)] = $this->normalize((string) $row->total);
        }

        return $grouped;
    }

    private function countBetween(string $table, int $companyId, string $column, string $start, string $end): int
    {
        return (int) DB::table($table)
            ->where('company_id', $companyId)
            ->where('is_deleted', 0)
            ->whereNull('deleted_at')
            ->whereBetween($column, [$start, $end])
            ->count();
    }

    private function currencyCode(int $currencyId): string
    {
        if ($currencyId < 1 || ! DB::getSchemaBuilder()->hasTable('currencies')) {
            return '#'.$currencyId;
        }

        $code = DB::table('currencies')->where('id', $currencyId)->value('code');

        return is_string($code) && $code !== '' ? $code : '#'.$currencyId;
    }

    private function normalize(string $amount): string
    {
        $amount = trim($amount);
        if ($amount === '' || ! is_numeric($amount)) {
            return '0.000000';
        }

        return bcadd($amount, '0', 6);
    }

    private function formatAmount(string $amount): string
    {
        $negative = bccomp($amount, '0', 6) < 0;
        $absolute = ltrim($this->normalize($amount), '-');
        $absolute = rtrim(rtrim($absolute, '0'), '.');
        if ($absolute === '') {
            $absolute = '0';
        }
        if (! str_contains($absolute, '.')) {
            $absolute .= '.00';
        } elseif (strlen(explode('.', $absolute, 2)[1]) === 1) {
            $absolute .= '0';
        }

        return $negative ? '-'.$absolute : $absolute;
    }
}
