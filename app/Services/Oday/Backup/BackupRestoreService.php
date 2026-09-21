<?php

namespace App\Services\Oday\Backup;

use App\Models\OdayBackupRun;
use App\Services\OdayDashboardStore;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use ZipArchive;

final class BackupRestoreService
{
    public function __construct(private OdayDashboardStore $store) {}

    public function restoreFromRun(int $companyId, int $runId): void
    {
        $run = OdayBackupRun::query()
            ->where('company_id', $companyId)
            ->where('id', $runId)
            ->firstOrFail();

        $path = $run->storage_path;
        if (! is_string($path) || ! File::exists($path)) {
            throw new \RuntimeException('backup_missing');
        }

        try {
            $this->createSafetySnapshot($companyId, $path);
            $this->applyRestore($companyId, $path);
        } catch (\Throwable $e) {
            throw $e;
        }
    }

    private function createSafetySnapshot(int $companyId, string $sourcePath): void
    {
        $dir = storage_path('app/oday/backups/'.$companyId.'/safety');
        File::ensureDirectoryExists($dir);
        File::copy($sourcePath, $dir.'/pre-restore-'.now()->format('Ymd-His').'.zip.enc');
    }

    private function applyRestore(int $companyId, string $path): void
    {
        if (! is_string($path) || ! File::exists($path)) {
            throw new \RuntimeException('backup_missing');
        }

        $encrypted = File::get($path);
        $zipBytes = BackupEncryption::decrypt($encrypted);
        $temp = storage_path('app/oday/backups/tmp/'.uniqid('restore_', true).'.zip');
        File::put($temp, $zipBytes);

        $zip = new ZipArchive();
        if ($zip->open($temp) !== true) {
            throw new \RuntimeException('zip_open_failed');
        }

        $manifestRaw = $zip->getFromName('manifest.json');
        if ($manifestRaw === false) {
            throw new \RuntimeException('manifest_missing');
        }
        $manifest = json_decode($manifestRaw, true);
        if (! is_array($manifest) || (int) ($manifest['company_id'] ?? 0) !== $companyId) {
            throw new \RuntimeException('manifest_invalid');
        }

        $dashboardRaw = $zip->getFromName('oday-dashboard.json');
        if (is_string($dashboardRaw)) {
            $items = json_decode($dashboardRaw, true);
            if (is_array($items)) {
                foreach ($items as $key => $row) {
                    if (! is_string($key) || ! is_array($row) || ! isset($row['value'])) {
                        continue;
                    }
                    $this->store->put($key, (string) $row['value'], (int) ($row['updated_at'] ?? round(microtime(true) * 1000)));
                }
            }
        }

        $sql = $zip->getFromName('database.sql');
        if (is_string($sql) && $sql !== '' && DB::getDriverName() === 'mysql') {
            DB::unprepared('SET FOREIGN_KEY_CHECKS=0;');
            DB::unprepared($sql);
            DB::unprepared('SET FOREIGN_KEY_CHECKS=1;');
        }

        $zip->close();
        File::delete($temp);
    }
}
