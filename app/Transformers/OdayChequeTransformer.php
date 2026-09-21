<?php

namespace App\Transformers;

use App\Models\OdayCheque;
use App\Models\OdayChequeStatusHistory;
use App\Models\User;
use App\Services\Oday\OdayChequeMoney;
use App\Services\Oday\OdayChequeStatusService;
use App\Utils\Traits\MakesHash;

class OdayChequeTransformer
{
    use MakesHash;

    public function __construct(private OdayChequeStatusService $statuses)
    {
    }

    public function transform(OdayCheque $cheque, User $viewer, bool $detailed = false): array
    {
        $currency = strtoupper($cheque->currency_code ?: OdayChequeMoney::CURRENCY_ILS);
        $canViewAccount = $this->canViewSensitiveAccount($viewer);

        $base = [
            'id' => $cheque->hashed_id,
            'direction' => $cheque->direction,
            'cheque_number' => $cheque->number,
            'amount' => $cheque->amountForApi(),
            'currency' => $currency,
            'issue_date' => $cheque->issue_date ?: '',
            'due_date' => $cheque->due_date ?: '',
            'bank_id' => $cheque->bank_id ?: '',
            'bank_name' => $cheque->bank_name ?: '',
            'status' => $cheque->status,
            'status_reason' => $cheque->status_reason ?: '',
            'is_overdue' => $this->statuses->isOverdue($cheque),
            'notes' => $cheque->notes ?: '',
            'client_id' => $cheque->client_id ? $this->encodePrimaryKey($cheque->client_id) : '',
            'vendor_id' => $cheque->vendor_id ? $this->encodePrimaryKey($cheque->vendor_id) : '',
            'payee' => $cheque->payee_name ?: '',
            'drawer' => $cheque->drawer_name ?: '',
            'account_reference' => $this->maskAccount($cheque->account_reference, $canViewAccount && $detailed),
            'project_id' => $cheque->project_id ? $this->encodePrimaryKey($cheque->project_id) : '',
            'invoice_id' => $cheque->invoice_id ? $this->encodePrimaryKey($cheque->invoice_id) : '',
            'scan_document_id' => $cheque->scan_document_id ? $this->encodePrimaryKey($cheque->scan_document_id) : '',
            'payment_id' => $cheque->payment_id ? $this->encodePrimaryKey($cheque->payment_id) : '',
            'client_name' => $cheque->client?->name ?: '',
            'vendor_name' => $cheque->vendor?->name ?: '',
            'created_at' => (int) $cheque->created_at,
            'updated_at' => (int) $cheque->updated_at,
        ];

        if ($detailed) {
            $base['status_history'] = $cheque->relationLoaded('statusHistories')
                ? $cheque->statusHistories->map(fn (OdayChequeStatusHistory $row) => [
                    'old_status' => $row->old_status,
                    'new_status' => $row->new_status,
                    'reason' => $row->reason,
                    'user_id' => $this->encodePrimaryKey($row->user_id),
                    'created_at' => $row->created_at?->toIso8601String(),
                ])->values()->all()
                : [];
            $base['project'] = $cheque->project ? [
                'id' => $cheque->project->hashed_id,
                'name' => $cheque->project->name,
            ] : null;
            $base['invoice'] = $cheque->invoice ? [
                'id' => $cheque->invoice->hashed_id,
                'number' => $cheque->invoice->number,
                'balance' => (float) $cheque->invoice->balance,
            ] : null;
            $base['attachment'] = $cheque->scanDocument ? [
                'id' => $cheque->scanDocument->hashed_id,
                'name' => $cheque->scanDocument->name,
                'type' => $cheque->scanDocument->type,
            ] : null;
        }

        return $base;
    }

    private function canViewSensitiveAccount(User $user): bool
    {
        return $user->isSuperUser() || $user->hasPermission('edit_payment');
    }

    private function maskAccount(?string $account, bool $full): string
    {
        $account = trim((string) $account);
        if ($account === '') {
            return '';
        }

        if ($full) {
            return $account;
        }

        if (strlen($account) <= 4) {
            return str_repeat('•', strlen($account));
        }

        return str_repeat('•', max(0, strlen($account) - 4)).substr($account, -4);
    }
}
