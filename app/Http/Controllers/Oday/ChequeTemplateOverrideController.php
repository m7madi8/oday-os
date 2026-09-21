<?php

namespace App\Http\Controllers\Oday;

use App\Http\Controllers\Controller;
use App\Models\OdayOfficeChequeTemplate;
use App\Utils\Traits\MakesHash;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ChequeTemplateOverrideController extends Controller
{
    use MakesHash;

    public function show(string $bankId): JsonResponse
    {
        $this->assertCanView();
        $row = $this->findRow($bankId);

        return response()->json(['data' => $row ? $this->transform($row) : null]);
    }

    public function update(Request $request, string $bankId): JsonResponse
    {
        $this->assertAdmin();
        $validated = $request->validate([
            'width_mm' => ['required', 'numeric', 'min:50', 'max:300'],
            'height_mm' => ['required', 'numeric', 'min:30', 'max:200'],
            'fields_json' => ['required', 'array'],
            'scan_document_id' => ['nullable', 'string'],
            'mode' => ['nullable', 'in:scan-overlay'],
        ]);

        $scanId = null;
        if (! empty($validated['scan_document_id'])) {
            $scanId = $this->decodePrimaryKey($validated['scan_document_id']);
        }

        $row = OdayOfficeChequeTemplate::query()->updateOrCreate(
            [
                'company_id' => auth()->user()->companyId(),
                'bank_id' => $bankId,
            ],
            [
                'mode' => 'scan-overlay',
                'width_mm' => $validated['width_mm'],
                'height_mm' => $validated['height_mm'],
                'fields_json' => $validated['fields_json'],
                'scan_document_id' => $scanId,
                'verified_at' => null,
                'verified_by_user_id' => null,
            ],
        );

        return response()->json(['data' => $this->transform($row)]);
    }

    public function verify(Request $request, string $bankId): JsonResponse
    {
        $this->assertAdmin();
        $request->validate([
            'confirmed' => ['required', 'accepted'],
        ]);

        $row = $this->findRow($bankId);
        if (! $row) {
            abort(404);
        }

        $row->verified_at = Carbon::now();
        $row->verified_by_user_id = auth()->id();
        $row->save();

        return response()->json(['data' => $this->transform($row)]);
    }

    private function findRow(string $bankId): ?OdayOfficeChequeTemplate
    {
        return OdayOfficeChequeTemplate::query()
            ->where('company_id', auth()->user()->companyId())
            ->where('bank_id', $bankId)
            ->first();
    }

    /**
     * @return array<string, mixed>
     */
    private function transform(OdayOfficeChequeTemplate $row): array
    {
        return [
            'bank_id' => $row->bank_id,
            'mode' => $row->mode,
            'width_mm' => (float) $row->width_mm,
            'height_mm' => (float) $row->height_mm,
            'fields' => $row->fields_json,
            'scan_document_id' => $row->scan_document_id
                ? $this->encodePrimaryKey($row->scan_document_id)
                : '',
            'verified' => (bool) $row->verified_at,
            'verified_at' => $row->verified_at?->toIso8601String(),
        ];
    }

    private function assertCanView(): void
    {
        $user = auth()->user();
        if (! ($user->isSuperUser() || $user->hasPermission('view_payment'))) {
            abort(403);
        }
    }

    private function assertAdmin(): void
    {
        $user = auth()->user();
        if (! ($user->isSuperUser() || $user->hasPermission('edit_payment'))) {
            abort(403);
        }
    }
}
