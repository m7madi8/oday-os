<?php

namespace App\Services\Oday;

use App\Models\OdayCheque;
use App\Models\User;
use App\Services\OdayDashboardStore;
use Illuminate\Support\Carbon;

class OdayBackupSnapshotService
{
    public function __construct(private OdayDashboardStore $store) {}

    public function build(User $user): array
    {
        $company = $user->company;
        $items = $this->store->all();

        $office = $this->decodeItem($items['office-settings'] ?? null);
        $dashboard = $this->decodeItem($items['dashboard-settings'] ?? null);
        $quickNotes = $items['quick-notes']['value'] ?? '';

        $cheques = OdayCheque::query()
            ->where('company_id', $user->companyId())
            ->where('is_deleted', false)
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn (OdayCheque $row) => $row->only([
                'id',
                'number',
                'amount',
                'due_date',
                'status',
                'direction',
                'bank_name',
                'notes',
                'client_id',
                'invoice_id',
                'payment_id',
                'created_at',
                'updated_at',
            ]))
            ->values()
            ->all();

        return [
            'version' => 2,
            'exportedAt' => Carbon::now()->toIso8601String(),
            'product' => 'ODAY OS',
            'company' => [
                'id' => $company?->id,
                'name' => $company ? (string) $company->getSetting('name') : null,
            ],
            'officeSettings' => $office,
            'dashboardSettings' => $dashboard,
            'quickNotes' => is_string($quickNotes) ? $quickNotes : '',
            'storeItems' => $items,
            'cheques' => $cheques,
        ];
    }

    private function decodeItem(?array $row): mixed
    {
        if (! is_array($row)) {
            return null;
        }

        $raw = $row['value'] ?? null;
        if (! is_string($raw) || $raw === '') {
            return null;
        }

        $decoded = json_decode($raw, true);

        return is_array($decoded) ? $decoded : null;
    }
}
