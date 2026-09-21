<?php

namespace App\Http\Controllers\Oday;

use App\Http\Controllers\Controller;
use App\Services\Oday\GoogleDriveBackupService;
use App\Services\Oday\OdayBackupSnapshotService;
use App\Utils\TruthSource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class GoogleDriveBackupController extends Controller
{
    public function status(GoogleDriveBackupService $drive): JsonResponse
    {
        $companyId = (int) app(TruthSource::class)->getCompany()->id;

        return response()->json($drive->status($companyId));
    }

    public function connect(GoogleDriveBackupService $drive): JsonResponse
    {
        $truth = app(TruthSource::class);
        $companyId = (int) $truth->getCompany()->id;
        $userId = (int) $truth->getUser()->id;
        $state = $drive->createOAuthState($companyId, $userId);

        return response()->json([
            'url' => $drive->authorizationUrl($state),
        ]);
    }

    public function disconnect(GoogleDriveBackupService $drive): JsonResponse
    {
        $companyId = (int) app(TruthSource::class)->getCompany()->id;
        $drive->disconnect($companyId);

        return response()->json(['connected' => false]);
    }

    public function upload(
        GoogleDriveBackupService $drive,
        OdayBackupSnapshotService $snapshots,
    ): JsonResponse {
        $truth = app(TruthSource::class);
        $companyId = (int) $truth->getCompany()->id;
        $user = $truth->getUser();

        $payload = $snapshots->build($user);
        $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        if (! is_string($json)) {
            return response()->json(['message' => 'تعذر إنشاء النسخة الاحتياطية'], 500);
        }

        try {
            $file = $drive->uploadJsonBackup($companyId, $json);
        } catch (\RuntimeException $e) {
            $code = $e->getMessage();
            if ($code === 'google_not_connected') {
                return response()->json(['message' => 'اربط Google Drive أولاً من الإعدادات'], 422);
            }
            if ($code === 'google_token_expired') {
                return response()->json(['message' => 'انتهت صلاحية Google. أعد الربط من الإعدادات'], 401);
            }

            return response()->json(['message' => 'تعذر رفع النسخة إلى Google Drive'], 502);
        }

        return response()->json([
            'message' => 'تم رفع النسخة الاحتياطية إلى Google Drive',
            'file' => $file,
        ]);
    }

    public function callback(Request $request, GoogleDriveBackupService $drive): RedirectResponse
    {
        $dashboard = rtrim((string) config('oday.dashboard_url'), '/');
        $fail = fn (string $reason) => redirect($dashboard.'/?backup=google-error&reason='.urlencode($reason));

        if ($request->filled('error')) {
            return $fail('access_denied');
        }

        $state = (string) $request->query('state', '');
        $code = (string) $request->query('code', '');
        if ($state === '' || $code === '') {
            return $fail('invalid_callback');
        }

        $context = $drive->consumeOAuthState($state);
        if (! $context) {
            return $fail('invalid_state');
        }

        try {
            $connection = $drive->exchangeAuthorizationCode($code);
        } catch (\Throwable) {
            return $fail('token_exchange');
        }

        $drive->saveConnection((int) $context['company_id'], $connection);

        return redirect($dashboard.'/?backup=google-connected');
    }
}
