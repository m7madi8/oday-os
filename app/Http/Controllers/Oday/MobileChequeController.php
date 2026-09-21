<?php

/**
 * نظام عدي أبو ضحى — واجهة الشيكات المتنقلة (توافق مع الإصدار السابق).
 */

namespace App\Http\Controllers\Oday;

use App\Http\Controllers\Controller;
use App\Http\Requests\Oday\StoreOdayChequeRequest;
use App\Models\OdayCheque;
use App\Services\Oday\Cheque\OdayChequeService;
use App\Transformers\OdayChequeTransformer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
class MobileChequeController extends Controller
{
    public function __construct(
        private OdayChequeService $service,
        private OdayChequeTransformer $transformer,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $this->assertCanView();
        $paginator = $this->service->list(auth()->user(), $request->all());

        return response()->json([
            'data' => collect($paginator->items())->map(fn (OdayCheque $cheque) => $this->legacyListItem($cheque))->values(),
            'meta' => [
                'pagination' => [
                    'total' => $paginator->total(),
                    'count' => $paginator->count(),
                    'per_page' => $paginator->perPage(),
                    'current_page' => $paginator->currentPage(),
                    'total_pages' => $paginator->lastPage(),
                ],
            ],
        ]);
    }

    public function show(OdayCheque $cheque): JsonResponse
    {
        $this->assertCompany($cheque);
        $this->assertCanView();
        $cheque->load(['client', 'vendor', 'project', 'invoice', 'payment']);

        return response()->json(['data' => $this->legacyListItem($cheque)]);
    }

    public function store(StoreOdayChequeRequest $request): JsonResponse
    {
        $cheque = $this->service->create(auth()->user(), $this->mobilePayload($request));

        return response()->json(['data' => $this->legacyListItem($cheque)], 201);
    }

    public function update(StoreOdayChequeRequest $request, OdayCheque $cheque): JsonResponse
    {
        $this->assertCompany($cheque);
        $this->assertCanEdit();

        if ($request->filled('status') && $request->input('status') !== $cheque->status) {
            $cheque = $this->service->transition(
                $cheque,
                auth()->user(),
                (string) $request->input('status'),
                $request->input('status_reason') ?? $request->input('reason'),
            );
        } else {
            $cheque = $this->service->update($cheque, auth()->user(), $this->mobilePayload($request, $cheque));
        }

        return response()->json(['data' => $this->legacyListItem($cheque)]);
    }

    public function destroy(OdayCheque $cheque): JsonResponse
    {
        $this->assertCompany($cheque);
        $this->assertCanEdit();
        $this->service->softDelete($cheque, auth()->user());

        return response()->json(['message' => 'تم حذف الشيك']);
    }

    private function mobilePayload(StoreOdayChequeRequest $request, ?OdayCheque $existing = null): array
    {
        return [
            'direction' => $request->normalizedDirection(),
            'number' => $request->input('number'),
            'amount' => $request->normalizedAmount(),
            'currency_code' => strtoupper((string) $request->input('currency_code', 'ILS')),
            'due_date' => $request->input('due_date'),
            'issue_date' => $request->input('issue_date', $existing?->issue_date),
            'bank_name' => $request->input('bank_name'),
            'bank_id' => $request->input('bank_id'),
            'notes' => $request->input('notes'),
            'client_id' => $request->input('client_id'),
            'vendor_id' => $request->input('vendor_id'),
            'payee_name' => $request->input('payee_name'),
            'invoice_id' => $request->input('invoice_id'),
            'project_id' => $request->input('project_id'),
            'account_reference' => $request->input('account_reference'),
            'scan_document_id' => $request->input('scan_document_id'),
        ];
    }

    private function legacyListItem(OdayCheque $cheque): array
    {
        $modern = $this->transformer->transform($cheque, auth()->user());

        return [
            'id' => $modern['id'],
            'direction' => $cheque->direction === OdayCheque::DIRECTION_OUTGOING ? 'out' : 'in',
            'number' => $modern['cheque_number'],
            'bank_name' => $modern['bank_name'],
            'amount' => $modern['amount'],
            'currency_code' => $modern['currency'],
            'due_date' => $modern['due_date'],
            'status' => $modern['status'],
            'status_reason' => $modern['status_reason'],
            'is_overdue' => $modern['is_overdue'],
            'notes' => $modern['notes'],
            'client_id' => $modern['client_id'],
            'invoice_id' => $modern['invoice_id'],
            'payment_id' => $modern['payment_id'],
            'client_name' => $modern['client_name'],
            'vendor_name' => $modern['vendor_name'],
            'created_at' => $modern['created_at'],
            'updated_at' => $modern['updated_at'],
        ];
    }

    private function assertCompany(OdayCheque $cheque): void
    {
        if ((int) $cheque->company_id !== (int) auth()->user()->companyId()) {
            abort(404);
        }
    }

    private function assertCanView(): void
    {
        $user = auth()->user();
        if (! ($user->isSuperUser() || $user->hasPermission('view_payment') || $user->hasPermission('create_payment'))) {
            abort(403, 'لا صلاحية لعرض الشيكات');
        }
    }

    private function assertCanEdit(): void
    {
        $user = auth()->user();
        if (! ($user->isSuperUser() || $user->hasPermission('edit_payment') || $user->hasPermission('create_payment'))) {
            abort(403, 'لا صلاحية لتعديل الشيكات');
        }
    }
}
