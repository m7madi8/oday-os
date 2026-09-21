<?php

namespace App\Http\Controllers\Oday;

use App\Http\Controllers\Controller;
use App\Http\Requests\Oday\ChequeStoreRequest;
use App\Http\Requests\Oday\ChequeTransitionRequest;
use App\Http\Requests\Oday\ChequeUpdateRequest;
use App\Models\Invoice;
use App\Models\OdayCheque;
use App\Services\Oday\Cheque\OdayChequeService;
use App\Services\Oday\Cheque\OdayChequeSummaryService;
use App\Transformers\OdayChequeTransformer;
use App\Utils\Traits\MakesHash;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChequeController extends Controller
{
    use MakesHash;

    public function __construct(
        private OdayChequeService $service,
        private OdayChequeSummaryService $summary,
        private OdayChequeTransformer $transformer,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $this->assertCanView();
        $user = auth()->user();
        $paginator = $this->service->list($user, $this->listFilters($request));

        return response()->json([
            'data' => collect($paginator->items())->map(fn (OdayCheque $cheque) => $this->transformer->transform($cheque, $user))->values(),
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

    public function summary(Request $request): JsonResponse
    {
        $this->assertCanView();

        return response()->json([
            'data' => $this->summary->summarize(auth()->user()->companyId(), $request->query('direction')),
        ]);
    }

    public function invoiceBalance(Invoice $invoice): JsonResponse
    {
        $this->assertCanView();
        $this->assertCompanyEntity($invoice);

        return response()->json(['data' => $this->service->invoiceBalance($invoice)]);
    }

    public function show(OdayCheque $cheque): JsonResponse
    {
        $this->assertCanView();
        $this->assertCompany($cheque);

        $cheque->load(['client', 'vendor', 'project', 'invoice', 'scanDocument', 'statusHistories']);

        return response()->json([
            'data' => $this->transformer->transform($cheque, auth()->user(), true),
        ]);
    }

    public function store(ChequeStoreRequest $request): JsonResponse
    {
        $cheque = $this->service->create(auth()->user(), $request->validatedPayload());

        return response()->json([
            'data' => $this->transformer->transform($cheque, auth()->user(), true),
        ], 201);
    }

    public function update(ChequeUpdateRequest $request, OdayCheque $cheque): JsonResponse
    {
        $this->assertCompany($cheque);
        $this->assertCanEdit();

        $cheque = $this->service->update($cheque, auth()->user(), $request->validatedPayload());

        return response()->json([
            'data' => $this->transformer->transform($cheque, auth()->user(), true),
        ]);
    }

    public function transition(ChequeTransitionRequest $request, OdayCheque $cheque): JsonResponse
    {
        $this->assertCompany($cheque);
        $this->assertCanEdit();

        $cheque = $this->service->transition(
            $cheque,
            auth()->user(),
            $request->input('status'),
            $request->input('reason'),
        );

        return response()->json([
            'data' => $this->transformer->transform($cheque, auth()->user(), true),
        ]);
    }

    public function destroy(OdayCheque $cheque): JsonResponse
    {
        $this->assertCompany($cheque);
        $this->assertCanEdit();

        $this->service->softDelete($cheque, auth()->user());

        return response()->json(['message' => 'تم حذف الشيك']);
    }

    private function assertCompany(OdayCheque $cheque): void
    {
        if ((int) $cheque->company_id !== (int) auth()->user()->companyId()) {
            abort(404);
        }
    }

    private function assertCompanyEntity(Invoice $invoice): void
    {
        if ((int) $invoice->company_id !== (int) auth()->user()->companyId()) {
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

    /**
     * @return array<string, mixed>
     */
    private function listFilters(Request $request): array
    {
        $filters = $request->all();

        foreach (['client_id', 'project_id'] as $field) {
            if (! empty($filters[$field]) && ! is_numeric($filters[$field])) {
                $filters[$field] = $this->decodePrimaryKey($filters[$field]);
            }
        }

        return $filters;
    }
}
