<?php

namespace App\Http\Controllers\Oday;

use App\Http\Controllers\Controller;
use App\Models\OdayBackupRun;
use App\Models\OdayBackupSetting;
use App\Services\Oday\Backup\BackupEngine;
use App\Services\Oday\Backup\BackupGoogleDriveService;
use App\Services\Oday\Backup\BackupLocalPathValidator;
use App\Services\Oday\Backup\BackupRestoreService;
use App\Services\Oday\Backup\BackupSchedulerService;
use App\Utils\TruthSource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Symfony\Component\HttpFoundation\StreamedResponse;

class OdayBackupController extends Controller
{
    private function companyId(): int
    {
        return (int) app(TruthSource::class)->getCompany()->id;
    }

    public function settingsShow(): JsonResponse
    {
        $companyId = $this->companyId();
        $settings = OdayBackupSetting::query()->firstOrCreate(
            ['company_id' => $companyId],
            ['timezone' => config('app.timezone', 'UTC')]
        );

        return response()->json([
            'settings' => $this->publicSettings($settings),
            'google_connected' => app(BackupGoogleDriveService::class)->isConnected($companyId),
        ]);
    }

    public function settingsUpdate(Request $request): JsonResponse
    {
        $companyId = $this->companyId();
        $data = $request->validate([
            'drive_enabled' => 'sometimes|boolean',
            'local_enabled' => 'sometimes|boolean',
            'local_folder_path' => 'nullable|string|max:1024',
            'local_folder_label' => 'nullable|string|max:512',
            'local_mode' => 'nullable|in:desktop,web',
            'frequency' => 'nullable|in:daily,weekly',
            'time_of_day' => 'nullable|regex:/^\d{2}:\d{2}$/',
            'weekday' => 'nullable|integer|min:1|max:7',
            'timezone' => 'nullable|string|max:64',
            'retention_count_drive' => 'nullable|integer|min:1|max:365',
            'retention_count_local' => 'nullable|integer|min:1|max:365',
        ]);

        $settings = OdayBackupSetting::query()->firstOrCreate(['company_id' => $companyId]);
        $settings->fill($data);
        $settings->save();

        return response()->json(['settings' => $this->publicSettings($settings->fresh())]);
    }

    public function testLocal(Request $request, BackupLocalPathValidator $validator): JsonResponse
    {
        $path = (string) $request->input('path', '');
        $result = $validator->validate($path);
        if (! $result['ok']) {
            return response()->json(['ok' => false, 'message' => $result['message']], 422);
        }

        return response()->json(['ok' => true, 'path' => $result['path']]);
    }

    public function googleConnect(BackupGoogleDriveService $google): JsonResponse
    {
        $truth = app(TruthSource::class);
        $state = $google->signedState($this->companyId(), (int) $truth->getUser()->id);

        return response()->json(['url' => $google->authorizationUrl($state)]);
    }

    public function googleCallback(Request $request, BackupGoogleDriveService $google): RedirectResponse
    {
        $dashboard = rtrim((string) config('oday.dashboard_url'), '/').'/?page=settings&section=backup';

        if ($request->filled('error')) {
            return redirect($dashboard.'&backup=google-error');
        }

        $state = (string) $request->query('state', '');
        $code = (string) $request->query('code', '');
        $context = $google->parseState($state);
        if (! $context || ! $code) {
            return redirect($dashboard.'&backup=google-error');
        }

        try {
            $google->connect((int) $context['company_id'], $code);
        } catch (\Throwable) {
            return redirect($dashboard.'&backup=google-error');
        }

        return redirect($dashboard.'&backup=google-connected');
    }

    public function googleDisconnect(BackupGoogleDriveService $google): JsonResponse
    {
        $google->disconnect($this->companyId());

        return response()->json(['google_connected' => false]);
    }

    public function runManual(BackupEngine $engine): JsonResponse
    {
        try {
            $run = $engine->run($this->companyId(), OdayBackupRun::TYPE_MANUAL);
        } catch (\RuntimeException $e) {
            $message = $e->getMessage() === 'backup_already_running'
                ? 'نسخة احتياطية قيد التنفيذ بالفعل'
                : 'تعذر تشغيل النسخ الاحتياطي';

            return response()->json(['message' => $message], 409);
        } catch (\Throwable) {
            return response()->json(['message' => 'تعذر تشغيل النسخ الاحتياطي'], 502);
        }

        return response()->json(['run' => $this->publicRun($run)]);
    }

    public function runScheduled(BackupSchedulerService $scheduler): JsonResponse
    {
        $count = $scheduler->runDueBackups();

        return response()->json(['started' => $count]);
    }

    public function runsIndex(): JsonResponse
    {
        $runs = OdayBackupRun::query()
            ->where('company_id', $this->companyId())
            ->orderByDesc('seq')
            ->limit(50)
            ->get()
            ->map(fn (OdayBackupRun $run) => $this->publicRun($run));

        return response()->json(['runs' => $runs]);
    }

    public function runRetry(int $id, Request $request, BackupEngine $engine): JsonResponse
    {
        $run = OdayBackupRun::query()
            ->where('company_id', $this->companyId())
            ->where('id', $id)
            ->firstOrFail();

        $destination = (string) $request->input('destination', '');
        try {
            $run = $engine->retryDestination($run, $destination);
        } catch (\Throwable) {
            return response()->json(['message' => 'تعذر إعادة المحاولة'], 422);
        }

        return response()->json(['run' => $this->publicRun($run)]);
    }

    public function runDownload(int $id): StreamedResponse|JsonResponse
    {
        $run = OdayBackupRun::query()
            ->where('company_id', $this->companyId())
            ->where('id', $id)
            ->firstOrFail();

        $path = $run->storage_path;
        if (! is_string($path) || ! File::exists($path)) {
            return response()->json(['message' => 'الملف غير متوفر'], 404);
        }

        return response()->streamDownload(function () use ($path) {
            echo File::get($path);
        }, $run->file_name, ['Content-Type' => 'application/octet-stream']);
    }

    public function markLocalSynced(int $id, Request $request, BackupEngine $engine): JsonResponse
    {
        $run = OdayBackupRun::query()
            ->where('company_id', $this->companyId())
            ->where('id', $id)
            ->firstOrFail();

        try {
            $run = $engine->markLocalSynced($run, (string) $request->input('checksum', ''));
        } catch (\Throwable) {
            return response()->json(['message' => 'فشل تأكيد النسخة المحلية'], 422);
        }

        return response()->json(['run' => $this->publicRun($run)]);
    }

    public function restore(Request $request, BackupRestoreService $restore): JsonResponse
    {
        $request->validate([
            'run_id' => 'required|integer',
            'confirm' => 'required|boolean',
        ]);
        if (! $request->boolean('confirm')) {
            return response()->json(['message' => 'يلزم تأكيد الاستعادة'], 422);
        }

        try {
            $restore->restoreFromRun($this->companyId(), (int) $request->input('run_id'));
        } catch (\Throwable $e) {
            return response()->json(['message' => 'تعذر الاستعادة — '.$e->getMessage()], 422);
        }

        return response()->json(['message' => 'تمت الاستعادة بنجاح']);
    }

    private function publicSettings(OdayBackupSetting $settings): array
    {
        return [
            'drive_enabled' => (bool) $settings->drive_enabled,
            'local_enabled' => (bool) $settings->local_enabled,
            'google_account_email' => $settings->google_account_email,
            'drive_folder_name' => BackupGoogleDriveService::FOLDER_NAME,
            'local_folder_path' => $settings->local_folder_path,
            'local_folder_label' => $settings->local_folder_label,
            'local_mode' => $settings->local_mode,
            'frequency' => $settings->frequency,
            'time_of_day' => $settings->time_of_day,
            'weekday' => $settings->weekday,
            'timezone' => $settings->timezone,
            'retention_count_drive' => (int) $settings->retention_count_drive,
            'retention_count_local' => (int) $settings->retention_count_local,
            'last_success_at' => $settings->last_success_at?->toIso8601String(),
        ];
    }

    private function publicRun(OdayBackupRun $run): array
    {
        return [
            'id' => $run->id,
            'seq' => $run->seq,
            'file_name' => $run->file_name,
            'type' => $run->type,
            'started_at' => $run->started_at?->toIso8601String(),
            'finished_at' => $run->finished_at?->toIso8601String(),
            'size_bytes' => (int) $run->size_bytes,
            'checksum_sha256' => $run->checksum_sha256,
            'status' => $run->status,
            'drive_status' => $run->drive_status,
            'drive_error' => $run->drive_error,
            'local_status' => $run->local_status,
            'local_error' => $run->local_error,
        ];
    }
}
