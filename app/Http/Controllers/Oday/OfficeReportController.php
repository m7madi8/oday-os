<?php

namespace App\Http\Controllers\Oday;

use App\Http\Controllers\Controller;
use App\Services\Oday\Reports\OdayOfficeReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OfficeReportController extends Controller
{
    public function show(Request $request, OdayOfficeReportService $reports): JsonResponse
    {
        $user = auth()->user();
        if (! $user || ! ($user->isSuperUser() || $user->hasPermission('view_reports') || $user->hasPermission('view_invoice'))) {
            abort(403, 'لا صلاحية لعرض التقارير');
        }

        $validated = $request->validate([
            'year' => 'required|integer|min:2000|max:2100',
            'month' => 'nullable',
        ]);

        $month = $validated['month'] ?? null;
        if ($month === null || $month === '' || $month === 'all') {
            $monthNumber = null;
        } elseif (is_numeric($month) && (int) $month >= 1 && (int) $month <= 12) {
            $monthNumber = (int) $month;
        } else {
            abort(422, 'الشهر غير صالح');
        }

        return response()->json([
            'data' => $reports->summarize((int) $user->companyId(), (int) $validated['year'], $monthNumber),
        ]);
    }
}
