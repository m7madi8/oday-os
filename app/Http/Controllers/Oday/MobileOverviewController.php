<?php

/**
 * نظام عدي أبو ضحى — نظرة الجوال المالية.
 */

namespace App\Http\Controllers\Oday;

use App\Http\Controllers\Controller;
use App\Services\Oday\OdayMobileOverviewService;
use Illuminate\Http\JsonResponse;

class MobileOverviewController extends Controller
{
    public function show(OdayMobileOverviewService $overview): JsonResponse
    {
        return response()->json($overview->build(auth()->user()));
    }
}
