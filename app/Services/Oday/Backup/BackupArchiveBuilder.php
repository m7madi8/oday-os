<?php

namespace App\Services\Oday\Backup;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use ZipArchive;

/**
 * Company backup archive.
 *
 * A full mysqldump is not written. It would include every company's rows and
 * the server would still hand the encrypted file to one company's administrator.
 * The JSON export below is only the acting company's cheque and settings rows.
 * It is not a complete recovery set. Restore stays disabled.
 */
final class BackupArchiveBuilder
{
    /**
     * @return array{zip_path: string, manifest: array<string, mixed>}
     */
    public function build(int $companyId, int $seq, string $type, string $timezone): array
    {
        $tempRoot = storage_path('app/oday/backups/tmp/'.uniqid('build_', true));
        File::ensureDirectoryExists($tempRoot);

        try {
            $jsonPath = $tempRoot.'/database.json';
            File::put($jsonPath, json_encode($this->companyDatabaseExport($companyId), JSON_UNESCAPED_UNICODE));

            $now = Carbon::now($timezone);
            $manifest = [
                'schema_version' => 1,
                'seq' => $seq,
                'type' => $type,
                'created_at' => $now->toIso8601String(),
                'app_version' => (string) config('ninja.app_version', 'oday-os'),
                'components' => ['database.json'],
                'company_id' => $companyId,
                'scope' => 'company',
                'database' => 'company_subset',
            ];
            File::put($tempRoot.'/manifest.json', json_encode($manifest, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

            $zipPath = $tempRoot.'.zip';
            $zip = new ZipArchive();
            if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
                throw new \RuntimeException('backup_zip_failed');
            }
            foreach (File::files($tempRoot) as $file) {
                $zip->addFile($file->getPathname(), $file->getFilename());
            }
            $zip->close();

            return ['zip_path' => $zipPath, 'manifest' => $manifest];
        } finally {
            if (File::isDirectory($tempRoot)) {
                File::deleteDirectory($tempRoot);
            }
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function companyDatabaseExport(int $companyId): array
    {
        $tables = ['oday_cheques', 'company_settings'];
        $payload = ['company_id' => $companyId, 'tables' => []];
        foreach ($tables as $table) {
            if (! DB::getSchemaBuilder()->hasTable($table)) {
                continue;
            }
            if (! DB::getSchemaBuilder()->hasColumn($table, 'company_id')) {
                continue;
            }
            $payload['tables'][$table] = DB::table($table)
                ->where('company_id', $companyId)
                ->limit(5000)
                ->get();
        }

        return $payload;
    }
}
