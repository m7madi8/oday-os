<?php

namespace App\Services\Oday\Cheque;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\OdayCheque;
use App\Models\Project;
use App\Models\User;
use App\Models\Vendor;
use App\Services\Oday\OdayChequeMoney;
use App\Services\Oday\OdayChequePaymentService;
use App\Services\Oday\OdayChequeStatusService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\QueryException;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class OdayChequeService
{
    public function __construct(
        private OdayChequeStatusService $statuses,
        private OdayChequeLifecycleService $lifecycle,
        private OdayChequePaymentService $clearing,
    ) {
    }

    public function list(User $user, array $filters): LengthAwarePaginator
    {
        $query = OdayCheque::query()
            ->with(['client', 'vendor', 'project', 'invoice'])
            ->company()
            ->where('is_deleted', false);

        if ($direction = $filters['direction'] ?? null) {
            if (strtolower($direction) !== 'all') {
                $query->where('direction', $this->statuses->normalizeDirection($direction));
            }
        }

        if ($status = $filters['status'] ?? null) {
            $query->where('status', $status);
        }

        if ($bank = $filters['bank_id'] ?? null) {
            $query->where('bank_id', $bank);
        }

        if ($clientId = $filters['client_id'] ?? null) {
            $query->where('client_id', $clientId);
        }

        if ($projectId = $filters['project_id'] ?? null) {
            $query->where('project_id', $projectId);
        }

        if ($currency = $filters['currency'] ?? null) {
            $query->where('currency_code', strtoupper($currency));
        }

        if ($from = $filters['due_from'] ?? null) {
            $query->whereDate('due_date', '>=', $from);
        }

        if ($to = $filters['due_to'] ?? null) {
            $query->whereDate('due_date', '<=', $to);
        }

        if (filter_var($filters['overdue'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
            $query->whereNotNull('due_date')->whereDate('due_date', '<', Carbon::today()->toDateString())
                ->whereNotIn('status', [
                    OdayCheque::STATUS_CLEARED,
                    OdayCheque::STATUS_RETURNED,
                    OdayCheque::STATUS_CANCELLED,
                ])
                ->where(function ($inner) {
                    $inner->where('direction', OdayCheque::DIRECTION_INCOMING)
                        ->orWhere('status', '!=', OdayCheque::STATUS_DRAFT);
                });
        }

        if ($search = trim((string) ($filters['filter'] ?? ''))) {
            $query->where(function ($inner) use ($search) {
                $inner->where('number', 'like', '%'.$search.'%')
                    ->orWhere('bank_name', 'like', '%'.$search.'%')
                    ->orWhere('payee_name', 'like', '%'.$search.'%')
                    ->orWhere('drawer_name', 'like', '%'.$search.'%')
                    ->orWhere('notes', 'like', '%'.$search.'%');
            });
        }

        $sort = $filters['sort'] ?? 'due_date';
        $order = strtolower((string) ($filters['order'] ?? 'asc')) === 'desc' ? 'desc' : 'asc';
        $allowedSort = ['due_date', 'issue_date', 'number', 'status', 'created_at', 'amount_minor'];
        if (! in_array($sort, $allowedSort, true)) {
            $sort = 'due_date';
        }

        if ($sort === 'due_date') {
            $query->orderByRaw('due_date is null')->orderBy('due_date', $order);
        } else {
            $query->orderBy($sort, $order);
        }

        $perPage = min(max((int) ($filters['per_page'] ?? 20), 1), 100);
        $page = max((int) ($filters['page'] ?? 1), 1);

        return $query->paginate($perPage, ['*'], 'page', $page);
    }

    public function create(User $user, array $data): OdayCheque
    {
        $direction = $this->statuses->normalizeDirection((string) $data['direction']);
        $currency = strtoupper((string) ($data['currency_code'] ?? OdayChequeMoney::CURRENCY_ILS));
        $amountMinor = OdayChequeMoney::decimalToMinor((string) $data['amount'], $currency);

        $this->validateDirectionalParties($direction, $data);
        $this->validateDates($data);
        $this->validateRelations($user->companyId(), $data);
        $this->assertUnique($user->companyId(), $data, null);

        $cheque = new OdayCheque();
        $cheque->company_id = $user->companyId();
        $cheque->user_id = $user->id;
        $cheque->updated_by_user_id = $user->id;
        $cheque->fill($this->mappedAttributes($data, $amountMinor, $currency, $direction));
        $cheque->status = $this->statuses->initialStatus($direction);
        $cheque->dedupe_key = ChequeMigrationMapper::buildDedupeKey(
            $cheque->bank_id,
            $cheque->bank_name,
            $cheque->account_reference,
            $cheque->number,
        );

        try {
            $cheque->save();
        } catch (QueryException $exception) {
            $this->translateDuplicateException($exception);
        }

        $this->lifecycle->recordCreation($cheque, $user);

        return $cheque->fresh(['client', 'vendor', 'project', 'invoice', 'scanDocument', 'statusHistories']);
    }

    public function update(OdayCheque $cheque, User $user, array $data): OdayCheque
    {
        $this->assertNotTerminal($cheque);

        $currency = strtoupper((string) ($data['currency_code'] ?? $cheque->currency_code));
        $amountMinor = isset($data['amount'])
            ? OdayChequeMoney::decimalToMinor((string) $data['amount'], $currency)
            : (int) $cheque->amount_minor;

        $direction = $this->statuses->normalizeDirection((string) ($data['direction'] ?? $cheque->direction));
        $payload = array_merge($cheque->toArray(), $data);
        $this->validateDirectionalParties($direction, $payload);
        $this->validateDates($payload);
        $this->validateRelations($user->companyId(), $payload);
        $this->assertUnique($user->companyId(), $payload, $cheque->id);

        $cheque->fill($this->mappedAttributes($payload, $amountMinor, $currency, $direction));
        $cheque->updated_by_user_id = $user->id;
        $cheque->dedupe_key = ChequeMigrationMapper::buildDedupeKey(
            $cheque->bank_id,
            $cheque->bank_name,
            $cheque->account_reference,
            $cheque->number,
        );

        try {
            $cheque->save();
        } catch (QueryException $exception) {
            $this->translateDuplicateException($exception);
        }

        return $cheque->fresh(['client', 'vendor', 'project', 'invoice', 'scanDocument', 'statusHistories']);
    }

    public function transition(OdayCheque $cheque, User $user, string $status, ?string $reason): OdayCheque
    {
        $old = (string) $cheque->status;
        $this->statuses->assertTransition($cheque, $status);
        $this->statuses->assertReason($status, $reason);

        if ($old === $status) {
            return $cheque;
        }

        $cheque->status = $status;
        if ($this->statuses->requiresReason($status)) {
            $cheque->status_reason = $reason;
        }
        $cheque->updated_by_user_id = $user->id;
        $cheque->save();

        $this->lifecycle->recordTransition($cheque, $old, $status, $reason, $user);

        if ($status === OdayCheque::STATUS_CLEARED) {
            $cheque = $this->clearing->clear($cheque, $user);
        }

        return $cheque->fresh(['client', 'vendor', 'project', 'invoice', 'scanDocument', 'statusHistories']);
    }

    public function softDelete(OdayCheque $cheque, User $user): void
    {
        if ($this->statuses->isTerminal((string) $cheque->status)) {
            throw ValidationException::withMessages([
                'cheque' => ['لا يمكن حذف شيك منتهي. استخدم إلغاء الشيك بدلاً من ذلك.'],
            ]);
        }

        $cheque->is_deleted = true;
        $cheque->updated_by_user_id = $user->id;
        $cheque->save();
        $cheque->delete();
    }

    /**
     * @return array{total:string,paid:string,outstanding:string}
     */
    public function invoiceBalance(Invoice $invoice): array
    {
        $currency = OdayChequeMoney::CURRENCY_ILS;
        $places = OdayChequeMoney::decimalPlaces($currency);
        $total = number_format((float) $invoice->amount, $places, '.', '');
        $outstanding = number_format((float) $invoice->balance, $places, '.', '');
        $paid = bcsub($total, $outstanding, $places);

        return [
            'total' => OdayChequeMoney::normalize($total, $currency),
            'paid' => OdayChequeMoney::normalize($paid, $currency),
            'outstanding' => OdayChequeMoney::normalize($outstanding, $currency),
        ];
    }

    private function mappedAttributes(array $data, int $amountMinor, string $currency, string $direction): array
    {
        return [
            'direction' => $direction,
            'number' => $data['number'],
            'bank_name' => $data['bank_name'] ?? null,
            'bank_id' => $data['bank_id'] ?? null,
            'amount_minor' => $amountMinor,
            'amount' => OdayChequeMoney::minorToDecimal($amountMinor, $currency),
            'currency_code' => $currency,
            'issue_date' => $data['issue_date'] ?? null,
            'due_date' => $data['due_date'] ?? null,
            'client_id' => $data['client_id'] ?? null,
            'vendor_id' => $data['vendor_id'] ?? null,
            'payee_name' => $data['payee_name'] ?? null,
            'drawer_name' => $data['drawer_name'] ?? null,
            'account_reference' => $data['account_reference'] ?? null,
            'project_id' => $data['project_id'] ?? null,
            'invoice_id' => $data['invoice_id'] ?? null,
            'scan_document_id' => $data['scan_document_id'] ?? null,
            'notes' => $data['notes'] ?? null,
        ];
    }

    private function validateDirectionalParties(string $direction, array $data): void
    {
        if ($direction === OdayCheque::DIRECTION_INCOMING && empty($data['client_id'])) {
            throw ValidationException::withMessages([
                'client_id' => ['العميل مطلوب للشيكات الواردة'],
            ]);
        }

        if ($direction === OdayCheque::DIRECTION_OUTGOING && empty($data['vendor_id']) && trim((string) ($data['payee_name'] ?? '')) === '') {
            throw ValidationException::withMessages([
                'payee_name' => ['المستفيد أو المورد مطلوب للشيكات الصادرة'],
            ]);
        }
    }

    private function validateDates(array $data): void
    {
        $issue = $data['issue_date'] ?? null;
        $due = $data['due_date'] ?? null;

        if ($issue && $due && Carbon::parse($due)->lt(Carbon::parse($issue))) {
            throw ValidationException::withMessages([
                'due_date' => ['تاريخ الاستحقاق يجب أن يكون في أو بعد تاريخ الإصدار'],
            ]);
        }
    }

    private function validateRelations(int $companyId, array $data): void
    {
        $clientId = $data['client_id'] ?? null;
        $projectId = $data['project_id'] ?? null;
        $invoiceId = $data['invoice_id'] ?? null;
        $vendorId = $data['vendor_id'] ?? null;

        if ($clientId) {
            $client = Client::query()->where('company_id', $companyId)->find($clientId);
            if (! $client) {
                throw ValidationException::withMessages(['client_id' => ['العميل غير موجود في هذا المكتب']]);
            }
        }

        if ($vendorId) {
            $vendor = Vendor::query()->where('company_id', $companyId)->find($vendorId);
            if (! $vendor) {
                throw ValidationException::withMessages(['vendor_id' => ['المورد غير موجود في هذا المكتب']]);
            }
        }

        if ($projectId) {
            $project = Project::query()->where('company_id', $companyId)->find($projectId);
            if (! $project) {
                throw ValidationException::withMessages(['project_id' => ['المشروع غير موجود في هذا المكتب']]);
            }
            if ($clientId && (int) $project->client_id !== (int) $clientId) {
                throw ValidationException::withMessages(['project_id' => ['المشروع لا يتبع العميل المحدد']]);
            }
        }

        if ($invoiceId) {
            $invoice = Invoice::query()->where('company_id', $companyId)->find($invoiceId);
            if (! $invoice) {
                throw ValidationException::withMessages(['invoice_id' => ['الفاتورة غير موجودة في هذا المكتب']]);
            }
            if ($clientId && (int) $invoice->client_id !== (int) $clientId) {
                throw ValidationException::withMessages(['invoice_id' => ['الفاتورة لا تتبع العميل المحدد']]);
            }
            if ($projectId && (int) $invoice->project_id !== (int) $projectId) {
                throw ValidationException::withMessages(['invoice_id' => ['الفاتورة لا تتبع المشروع المحدد']]);
            }
        }
    }

    private function assertUnique(int $companyId, array $data, ?int $exceptId): void
    {
        $dedupe = ChequeMigrationMapper::buildDedupeKey(
            $data['bank_id'] ?? null,
            $data['bank_name'] ?? null,
            $data['account_reference'] ?? null,
            (string) $data['number'],
        );

        $query = OdayCheque::query()
            ->where('company_id', $companyId)
            ->where('dedupe_key', $dedupe)
            ->where('is_deleted', false);

        if ($exceptId) {
            $query->where('id', '!=', $exceptId);
        }

        if ($query->exists()) {
            throw ValidationException::withMessages([
                'number' => ['يوجد شيك بنفس الرقم لهذا البنك والحساب في المكتب'],
            ]);
        }
    }

    private function assertNotTerminal(OdayCheque $cheque): void
    {
        if ($this->statuses->isTerminal((string) $cheque->status)) {
            throw ValidationException::withMessages([
                'cheque' => ['الشيك في حالة نهائية ولا يمكن تعديله'],
            ]);
        }
    }

    private function translateDuplicateException(QueryException $exception): void
    {
        if (str_contains($exception->getMessage(), 'oday_cheques_company_dedupe_unique')) {
            throw ValidationException::withMessages([
                'number' => ['يوجد شيك بنفس الرقم لهذا البنك والحساب في المكتب'],
            ]);
        }

        throw $exception;
    }
}
