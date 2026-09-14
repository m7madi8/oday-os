<?php

/**
 * نظام عدي أبو ضحى — مسارات لوحة التحكم.
 */

use App\Http\Controllers\OdayDashboardController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/oday')->middleware(['api', 'throttle:60,1', 'oday.token'])->group(function () {
    Route::get('items', [OdayDashboardController::class, 'index']);
    Route::get('items/{key}', [OdayDashboardController::class, 'show']);
    Route::put('items/{key}', [OdayDashboardController::class, 'upsert']);
});
