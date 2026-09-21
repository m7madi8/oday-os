<?php

namespace App\Http\Controllers\Oday;

use App\Http\Controllers\Controller;
use App\Models\OdayOfficeChequePrintSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChequePrintCalibrationController extends Controller
{
    public function show(): JsonResponse
    {
        $this->assertCanView();
        $row = $this->forCompany();

        return response()->json([
            'data' => [
                'offset_x_mm' => (float) $row->offset_x_mm,
                'offset_y_mm' => (float) $row->offset_y_mm,
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $this->assertCanEdit();
        $validated = $request->validate([
            'offset_x_mm' => ['required', 'numeric', 'between:-20,20'],
            'offset_y_mm' => ['required', 'numeric', 'between:-20,20'],
        ]);

        $row = $this->forCompany();
        $row->offset_x_mm = round((float) $validated['offset_x_mm'], 1);
        $row->offset_y_mm = round((float) $validated['offset_y_mm'], 1);
        $row->save();

        return response()->json([
            'data' => [
                'offset_x_mm' => (float) $row->offset_x_mm,
                'offset_y_mm' => (float) $row->offset_y_mm,
            ],
        ]);
    }

    private function forCompany(): OdayOfficeChequePrintSetting
    {
        $companyId = (int) auth()->user()->companyId();

        return OdayOfficeChequePrintSetting::query()->firstOrCreate(
            ['company_id' => $companyId],
            ['offset_x_mm' => 0, 'offset_y_mm' => 0],
        );
    }

    private function assertCanView(): void
    {
        $user = auth()->user();
        if (! ($user->isSuperUser() || $user->hasPermission('view_payment') || $user->hasPermission('create_payment'))) {
            abort(403, 'لا صلاحية');
        }
    }

    private function assertCanEdit(): void
    {
        $user = auth()->user();
        if (! ($user->isSuperUser() || $user->hasPermission('edit_payment') || $user->hasPermission('create_payment'))) {
            abort(403, 'لا صلاحية');
        }
    }
}
