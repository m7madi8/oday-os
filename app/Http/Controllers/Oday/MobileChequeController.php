<?php

/**
 * نظام عدي أبو ضحى — واجهة الشيكات المتنقلة.
 */

namespace App\Http\Controllers\Oday;

use App\Http\Controllers\Controller;
use App\Http\Requests\Oday\StoreOdayChequeRequest;
use App\Models\OdayCheque;
use App\Services\Oday\OdayChequePaymentService;
use App\Utils\Traits\MakesHash;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MobileChequeController extends Controller
{
    use MakesHash;

    public function index(Request $request): JsonResponse
    {
        $this->assertCanView();

        $query = OdayCheque::query()
            ->with(['client'])
            ->company()
            ->where('is_deleted', false)
            ->orderByRaw('due_date is null')
            ->orderBy('due_date');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($search = trim((string) $request->query('filter', ''))) {
            $query->where(function ($inner) use ($search) {
                $inner->where('number', 'like', '%'.$search.'%')
                    ->orWhere('bank_name', 'like', '%'.$search.'%')
                    ->orWhere('notes', 'like', '%'.$search.'%');
            });
        }

        $perPage = min(max((int) $request->query('per_page', 20), 1), 50);
        $page = max((int) $request->query('page', 1), 1);
        $paginator = $query->paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'data' => collect($paginator->items())->map(fn (OdayCheque $cheque) => $this->transform($cheque))->values(),
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

        return response()->json(['data' => $this->transform($cheque->load(['client', 'invoice', 'payment']))]);
    }

    public function store(StoreOdayChequeRequest $request): JsonResponse
    {
        $user = auth()->user();
        $cheque = new OdayCheque();
        $cheque->company_id = $user->companyId();
        $cheque->user_id = $user->id;
        $cheque->fill($this->payload($request));
        $cheque->status = $request->input('status', OdayCheque::STATUS_PENDING);
        $cheque->save();

        return response()->json(['data' => $this->transform($cheque->fresh('client'))], 201);
    }

    public function update(StoreOdayChequeRequest $request, OdayCheque $cheque, OdayChequePaymentService $clearing): JsonResponse
    {
        $this->assertCompany($cheque);
        $nextStatus = (string) $request->input('status', $cheque->status);
        $wasCleared = $cheque->status === OdayCheque::STATUS_CLEARED;

        $cheque->fill($this->payload($request));

        if ($nextStatus === OdayCheque::STATUS_CLEARED && ! $wasCleared) {
            $cheque->save();
            $cheque = $clearing->clear($cheque, auth()->user());
        } else {
            $cheque->status = $nextStatus;
            $cheque->save();
        }

        return response()->json(['data' => $this->transform($cheque->fresh(['client', 'invoice', 'payment']))]);
    }

    public function destroy(OdayCheque $cheque): JsonResponse
    {
        $this->assertCompany($cheque);
        $this->assertCanEdit();

        $cheque->is_deleted = true;
        $cheque->save();
        $cheque->delete();

        return response()->json(['message' => 'تم حذف الشيك']);
    }

    private function payload(StoreOdayChequeRequest $request): array
    {
        return [
            'direction' => $request->input('direction', OdayCheque::DIRECTION_IN),
            'number' => $request->input('number'),
            'bank_name' => $request->input('bank_name'),
            'amount' => (float) $request->input('amount'),
            'due_date' => $request->input('due_date'),
            'notes' => $request->input('notes'),
            'client_id' => $request->input('client_id'),
            'invoice_id' => $request->input('invoice_id'),
        ];
    }

    private function transform(OdayCheque $cheque): array
    {
        return [
            'id' => $cheque->hashed_id,
            'direction' => $cheque->direction,
            'number' => $cheque->number,
            'bank_name' => $cheque->bank_name ?: '',
            'amount' => (float) $cheque->amount,
            'due_date' => $cheque->due_date ?: '',
            'status' => $cheque->status,
            'notes' => $cheque->notes ?: '',
            'client_id' => $cheque->client_id ? $this->encodePrimaryKey($cheque->client_id) : '',
            'invoice_id' => $cheque->invoice_id ? $this->encodePrimaryKey($cheque->invoice_id) : '',
            'payment_id' => $cheque->payment_id ? $this->encodePrimaryKey($cheque->payment_id) : '',
            'client_name' => $cheque->client?->name ?: '',
            'created_at' => (int) $cheque->created_at,
            'updated_at' => (int) $cheque->updated_at,
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
