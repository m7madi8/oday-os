<?php

namespace App\Services\Oday\Backup;

use App\Models\OdayBackupRun;
use App\Models\OdayBackupSetting;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

final class BackupEngine
{
    public function __construct(
        private BackupSequenceAllocator $sequences,
        private BackupArchiveBuilder $archives,
        private BackupGoogleDriveService $drive,
        private BackupLocalPathValidator $paths,
    ) {}

    public function run(int $companyId, string $type = OdayBackupRun::TYPE_MANUAL): OdayBackupRun
    {
        $lock = Cache::lock('oday:backup:run:'.$companyId, 3600);
        if (! $lock->get()) {
            throw new \RuntimeException('backup_already_running');
        }

        try {
            return $this->execute($companyId, $type);
        } finally {
            $lock->release();
        }
    }

    public function retryDestination(OdayBackupRun $run, string $destination): OdayBackupRun
    {
        if (! in_array($destination, ['drive', 'local'], true)) {
            throw new \RuntimeException('invalid_destination');
        }

        $path = $run->storage_path;
        if (! is_string($path) || ! File::exists($path)) {
            throw new \RuntimeException('backup_artifact_missing');
        }

        $settings = OdayBackupSetting::query()->where('company_id', $run->company_id)->first();
        if ($destination === 'drive') {
            $this->attemptDrive($run, $settings, $path);
        } else {
            $this->attemptLocal($run, $settings, $path);
        }

        $this->finalizeRun($run, $settings);

        return $run->fresh();
    }

    private function execute(int $companyId, string $type): OdayBackupRun
    {
        $settings = OdayBackupSetting::query()->firstOrCreate(
            ['company_id' => $companyId],
            ['timezone' => config('app.timezone', 'UTC')]
        );

        $seq = $this->sequences->next($companyId);
        $tz = $settings->timezone ?: 'UTC';
        $stamp = Carbon::now($tz);
        $fileName = sprintf(
            'ODAY-Backup_%04d_%s_%s_%s.zip.enc',
            $seq,
            $stamp->format('Y-m-d'),
            $stamp->format('His'),
            $type === OdayBackupRun::TYPE_AUTO ? 'auto' : 'manual'
        );

        $run = OdayBackupRun::query()->create([
            'company_id' => $companyId,
            'seq' => $seq,
            'file_name' => $fileName,
            'type' => $type,
            'started_at' => now(),
            'status' => OdayBackupRun::STATUS_RUNNING,
            'drive_status' => $settings->drive_enabled ? 'pending' : 'skipped',
            'local_status' => $settings->local_enabled ? 'pending' : 'skipped',
        ]);

        $artifactDir = storage_path('app/oday/backups/'.$companyId);
        File::ensureDirectoryExists($artifactDir);
        $artifactPath = $artifactDir.'/'.$fileName;
        $tempZipEnc = storage_path('app/oday/backups/tmp/'.uniqid('enc_', true).'.zip.enc');

        try {
            $built = $this->archives->build($companyId, $seq, $type, $tz);
            $zipBytes = File::get($built['zip_path']);
            File::delete($built['zip_path']);
            $encrypted = BackupEncryption::encrypt($zipBytes);
            File::ensureDirectoryExists(dirname($tempZipEnc));
            File::put($tempZipEnc, $encrypted);
            File::move($tempZipEnc, $artifactPath);

            $checksum = hash_file('sha256', $artifactPath) ?: '';
            $run->checksum_sha256 = $checksum;
            $run->size_bytes = File::size($artifactPath);
            $run->storage_path = $artifactPath;
            $run->save();

            if ($settings->drive_enabled) {
                $this->attemptDrive($run, $settings, $artifactPath);
            }
            if ($settings->local_enabled) {
                $this->attemptLocal($run, $settings, $artifactPath);
            }

            $this->finalizeRun($run, $settings);
            $this->applyRetention($companyId, $settings);

            return $run->fresh();
        } catch (\Throwable $e) {
            $run->status = OdayBackupRun::STATUS_FAILED;
            $run->error_message = $e->getMessage();
            $run->finished_at = now();
            $run->save();
            throw $e;
        } finally {
            if (File::exists($tempZipEnc)) {
                File::delete($tempZipEnc);
            }
        }
    }

    private function attemptDrive(OdayBackupRun $run, ?OdayBackupSetting $settings, string $path): void
    {
        if (! $settings?->drive_enabled) {
            $run->drive_status = 'skipped';
            $run->save();

            return;
        }

        $attempts = 0;
        while ($attempts < 3) {
            $attempts++;
            try {
                $meta = $this->drive->uploadEncryptedFile($run->company_id, $path, $run->file_name);
                if (! $this->verifyDrive($path, $meta)) {
                    throw new \RuntimeException('drive_checksum_mismatch');
                }
                $run->drive_status = 'success';
                $run->drive_file_id = $meta['id'] ?? null;
                $run->drive_error = null;
                $run->save();

                return;
            } catch (\Throwable $e) {
                $run->drive_error = $this->publicError($e);
                $run->drive_status = 'failed';
                $run->save();
                if ($attempts < 3) {
                    usleep((int) (500000 * (2 ** ($attempts - 1))));
                }
            }
        }
    }

    private function attemptLocal(OdayBackupRun $run, ?OdayBackupSetting $settings, string $path): void
    {
        if (! $settings?->local_enabled) {
            $run->local_status = 'skipped';
            $run->save();

            return;
        }

        if (($settings->local_mode ?? 'web') === 'web' || ! $settings->local_folder_path) {
            $run->local_status = 'pending_sync';
            $run->local_error = null;
            $run->save();

            return;
        }

        $attempts = 0;
        while ($attempts < 3) {
            $attempts++;
            $check = $this->paths->validate((string) $settings->local_folder_path, (int) $run->size_bytes + 1_000_000);
            if (! $check['ok']) {
                $run->local_status = 'failed';
                $run->local_error = $check['message'] ?? 'local_path_invalid';
                $run->save();

                return;
            }

            $target = rtrim($check['path'], DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.$run->file_name;
            try {
                File::copy($path, $target);
                if (hash_file('sha256', $target) !== $run->checksum_sha256) {
                    throw new \RuntimeException('local_checksum_mismatch');
                }
                $run->local_status = 'success';
                $run->local_error = null;
                $run->save();

                return;
            } catch (\Throwable $e) {
                $run->local_error = $this->publicError($e);
                $run->local_status = 'failed';
                $run->save();
                if ($attempts < 3) {
                    usleep((int) (500000 * (2 ** ($attempts - 1))));
                }
            }
        }
    }

    private function finalizeRun(OdayBackupRun $run, ?OdayBackupSetting $settings): void
    {
        $driveFail = $run->drive_status === 'failed';
        $localFail = $run->local_status === 'failed';

        if ($driveFail && $localFail) {
            $run->status = OdayBackupRun::STATUS_FAILED;
        } elseif ($driveFail || $localFail) {
            $run->status = OdayBackupRun::STATUS_PARTIAL;
        } else {
            $run->status = OdayBackupRun::STATUS_SUCCESS;
        }

        if (in_array($run->status, [OdayBackupRun::STATUS_SUCCESS, OdayBackupRun::STATUS_PARTIAL], true) && $settings) {
            $settings->last_success_at = now();
            $settings->save();
        }

        $run->finished_at = now();
        $run->save();
    }

    private function applyRetention(int $companyId, OdayBackupSetting $settings): void
    {
        $runs = OdayBackupRun::query()
            ->where('company_id', $companyId)
            ->whereIn('status', [OdayBackupRun::STATUS_SUCCESS, OdayBackupRun::STATUS_PARTIAL])
            ->orderByDesc('seq')
            ->get();

        if ($runs->isEmpty()) {
            return;
        }

        $newestSuccess = $runs->first();
        $driveKeep = $runs->filter(fn ($r) => $r->drive_status === 'success')->take($settings->retention_count_drive)->pluck('file_name')->all();
        $localKeep = $runs->filter(fn ($r) => in_array($r->local_status, ['success', 'pending_sync'], true))->take($settings->retention_count_local)->pluck('file_name')->all();

        if ($newestSuccess && $newestSuccess->drive_status === 'success' && ! in_array($newestSuccess->file_name, $driveKeep, true)) {
            $driveKeep[] = $newestSuccess->file_name;
        }

        foreach ($runs as $run) {
            if ($run->drive_status === 'success' && ! in_array($run->file_name, $driveKeep, true)) {
                /* drive retention handled via API delete by pattern */
            }
            if ($run->local_status === 'success' && $settings->local_folder_path && ! in_array($run->file_name, $localKeep, true)) {
                $localFile = rtrim((string) $settings->local_folder_path, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.$run->file_name;
                if (File::exists($localFile) && $run->id !== $newestSuccess?->id) {
                    try {
                        File::delete($localFile);
                    } catch (\Throwable $e) {
                        Log::warning('oday.backup.local_delete_failed', ['message' => $e->getMessage()]);
                    }
                }
            }
        }

        if ($settings->drive_enabled) {
            $this->drive->deleteDriveFilesByPattern($companyId, array_values(array_unique($driveKeep)));
        }
    }

    private function verifyDrive(string $path, array $meta): bool
    {
        $size = File::size($path);
        if (isset($meta['size']) && (int) $meta['size'] !== $size) {
            return false;
        }

        return true;
    }

    private function publicError(\Throwable $e): string
    {
        $map = [
            'google_not_connected' => 'Google Drive غير مرتبط',
            'invalid_grant' => 'انتهى تفويض Google — أعد الربط',
            'local_checksum_mismatch' => 'فشل التحقق من النسخة المحلية',
            'drive_checksum_mismatch' => 'فشل التحقق من Google Drive',
        ];
        $key = $e->getMessage();

        return $map[$key] ?? 'تعذر إكمال العملية';
    }

    public function markLocalSynced(OdayBackupRun $run, string $checksum): OdayBackupRun
    {
        if ($checksum !== $run->checksum_sha256) {
            throw new \RuntimeException('checksum_mismatch');
        }
        $run->local_status = 'success';
        $run->local_error = null;
        if ($run->status === OdayBackupRun::STATUS_PARTIAL && $run->drive_status !== 'failed') {
            $run->status = OdayBackupRun::STATUS_SUCCESS;
        }
        $run->save();

        return $run;
    }
}
