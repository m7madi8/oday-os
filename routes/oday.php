<?php

/**
 * نظام عدي أبو ضحى — مسارات لوحة التحكم والجوال.
 */

use App\Http\Controllers\Oday\DesktopUpdateController;
use App\Http\Controllers\OdayDashboardController;
use App\Http\Controllers\Oday\MobileAiController;
use App\Http\Controllers\Oday\MobileAuthController;
use App\Http\Controllers\Oday\MobileChequeController;
use App\Http\Controllers\Oday\MobileOfficeSettingsController;
use App\Http\Controllers\Oday\MobileOverviewController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/oday/desktop')->middleware(['api', 'throttle:30,1'])->group(function () {
    Route::get('version', [DesktopUpdateController::class, 'version']);
});

Route::prefix('api/oday')->middleware(['api', 'throttle:60,1', 'oday.token'])->group(function () {
    Route::get('items', [OdayDashboardController::class, 'index']);
    Route::get('items/{key}', [OdayDashboardController::class, 'show']);
    Route::put('items/{key}', [OdayDashboardController::class, 'upsert']);
});

Route::prefix('api/oday/mobile')->middleware(['api', 'throttle:60,1'])->group(function () {
    Route::get('health', fn () => response()->json(['ok' => true, 'message' => 'ODAY mobile API']));
});

Route::prefix('api/oday/mobile')->middleware(['api', 'throttle:login', 'email_db'])->group(function () {
    Route::post('login/precheck', [MobileAuthController::class, 'precheck']);
    Route::post('login', [MobileAuthController::class, 'login']);
});

Route::prefix('api/oday/mobile')->middleware(['api', 'throttle:api', 'token_auth', 'locale'])->group(function () {
    Route::post('logout', [MobileAuthController::class, 'logout']);
    Route::get('session', [MobileAuthController::class, 'session']);
    Route::get('overview', [MobileOverviewController::class, 'show']);
    Route::get('office-settings', [MobileOfficeSettingsController::class, 'show']);
    Route::put('office-settings', [MobileOfficeSettingsController::class, 'update']);
    Route::post('ai/chat', [MobileAiController::class, 'chat']);

    Route::get('items', [OdayDashboardController::class, 'index']);
    Route::get('items/{key}', [OdayDashboardController::class, 'show']);
    Route::put('items/{key}', [OdayDashboardController::class, 'upsert']);

    Route::get('cheques', [MobileChequeController::class, 'index']);
    Route::post('cheques', [MobileChequeController::class, 'store']);
    Route::get('cheques/{cheque}', [MobileChequeController::class, 'show']);
    Route::put('cheques/{cheque}', [MobileChequeController::class, 'update']);
    Route::delete('cheques/{cheque}', [MobileChequeController::class, 'destroy']);
});
