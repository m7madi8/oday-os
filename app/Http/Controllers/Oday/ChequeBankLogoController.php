<?php

namespace App\Http\Controllers\Oday;

use App\Http\Controllers\Controller;
use App\Services\Oday\Cheque\ChequeBankLogoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChequeBankLogoController extends Controller
{
    public function __construct(private ChequeBankLogoService $service)
    {
    }

    public function index(): JsonResponse
    {
        $this->assertCanView();

        return response()->json([
            'data' => $this->service->listForCompany((int) auth()->user()->companyId()),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->assertAdmin();
        $validated = $request->validate([
            'bank_id' => ['required', 'string', 'max:64'],
            'logo' => ['required', 'file', 'max:512'],
        ]);

        $row = $this->service->store(
            auth()->user(),
            $validated['bank_id'],
            $request->file('logo'),
        );

        $row->load('document');

        return response()->json([
            'data' => [
                'bank_id' => $row->bank_id,
                'document_id' => $row->document?->hashed_id,
            ],
        ], 201);
    }

    public function destroy(string $bankId): JsonResponse
    {
        $this->assertAdmin();
        $this->service->remove(auth()->user(), $bankId);

        return response()->json(['message' => 'تم حذف الشعار']);
    }

    private function assertCanView(): void
    {
        $user = auth()->user();
        if (! ($user->isSuperUser() || $user->hasPermission('view_payment') || $user->hasPermission('create_payment'))) {
            abort(403);
        }
    }

    private function assertAdmin(): void
    {
        $user = auth()->user();
        if (! ($user->isSuperUser() || $user->hasPermission('edit_payment'))) {
            abort(403, 'لا صلاحية لإدارة شعارات البنوك');
        }
    }
}
