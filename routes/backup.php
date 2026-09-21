<?php

use App\Http\Controllers\Oday\OdayBackupController;
use Illuminate\Support\Facades\Route;

Route::get('api/backup/google/callback', [OdayBackupController::class, 'googleCallback'])
    ->middleware(['api', 'throttle:30,1']);

Route::post('api/backup/run-scheduled', [OdayBackupController::class, 'runScheduled'])
    ->middleware(['api', 'throttle:10,1', 'cron.secret']);

Route::prefix('api/backup')->middleware(['api', 'throttle:api', 'token_auth', 'locale'])->group(function () {
    Route::get('settings', [OdayBackupController::class, 'settingsShow']);
    Route::put('settings', [OdayBackupController::class, 'settingsUpdate']);
    Route::post('test-local', [OdayBackupController::class, 'testLocal']);
    Route::get('google/connect', [OdayBackupController::class, 'googleConnect']);
    Route::delete('google', [OdayBackupController::class, 'googleDisconnect']);
    Route::post('run', [OdayBackupController::class, 'runManual']);
    Route::get('runs', [OdayBackupController::class, 'runsIndex']);
    Route::post('runs/{id}/retry', [OdayBackupController::class, 'runRetry']);
    Route::get('runs/{id}/download', [OdayBackupController::class, 'runDownload']);
    Route::post('runs/{id}/local-synced', [OdayBackupController::class, 'markLocalSynced']);
    Route::post('restore', [OdayBackupController::class, 'restore']);
});
