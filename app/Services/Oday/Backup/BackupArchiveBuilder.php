<?php

namespace App\Services\Oday\Backup;

use App\Services\OdayDashboardStore;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use ZipArchive;

final class BackupArchiveBuilder
{
    public function __construct(private OdayDashboardStore $dashboardStore) {}

    /**
     * @return array{zip_path: string, manifest: array<string, mixed>}
     */
    public function build(int $companyId, int $seq, string $type, string $timezone): array
    {
        $tempRoot = storage_path('app/oday/backups/tmp/'.uniqid('build_', true));
        File::ensureDirectoryExists($tempRoot);

        try {
            $components = [];
            $dumpPath = $tempRoot.'/database.sql';
            if ($this->writeDatabaseDump($dumpPath)) {
                $components[] = 'database.sql';
            } else {
                $jsonPath = $tempRoot.'/database.json';
                File::put($jsonPath, json_encode($this->fallbackDatabaseExport($companyId), JSON_UNESCAPED_UNICODE));
                $components[] = 'database.json';
            }

            $odayPath = $tempRoot.'/oday-dashboard.json';
            File::put($odayPath, json_encode($this->dashboardStore->all(), JSON_UNESCAPED_UNICODE));
            $components[] = 'oday-dashboard.json';

            $now = Carbon::now($timezone);
            $manifest = [
                'schema_version' => 1,
                'seq' => $seq,
                'type' => $type,
                'created_at' => $now->toIso8601String(),
                'app_version' => (string) config('ninja.app_version', 'oday-os'),
                'database_type' => (string) Config::get('database.default'),
                'components' => $components,
                'company_id' => $companyId,
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

    private function writeDatabaseDump(string $target): bool
    {
        if (Config::get('database.default') !== 'mysql') {
            return false;
        }

        $db = Config::get('database.connections.mysql');
        $host = $db['host'] ?? '127.0.0.1';
        $port = $db['port'] ?? '3306';
        $database = $db['database'] ?? '';
        $username = $db['username'] ?? '';
        $password = $db['password'] ?? '';

        if ($database === '' || $username === '') {
            return false;
        }

        $mysqldump = $this->findMysqldump();
        if ($mysqldump === null) {
            return false;
        }

        $command = [
            $mysqldump,
            '--host='.$host,
            '--port='.$port,
            '--user='.$username,
            '--single-transaction',
            '--quick',
            '--routines',
            '--triggers',
            $database,
        ];

        $env = [];
        if ($password !== '') {
            $env['MYSQL_PWD'] = $password;
        }

        $result = Process::timeout(600)->env($env)->run($command);
        if (! $result->successful()) {
            return false;
        }
        File::put($target, $result->output());
        if (! File::exists($target) || File::size($target) < 32) {
            if (File::exists($target)) {
                File::delete($target);
            }

            return false;
        }

        return true;
    }

    private function findMysqldump(): ?string
    {
        foreach (['mysqldump', 'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe'] as $candidate) {
            $result = Process::run([$candidate, '--version']);
            if ($result->successful()) {
                return $candidate;
            }
        }

        return null;
    }

    private function fallbackDatabaseExport(int $companyId): array
    {
        $tables = ['oday_cheques', 'company_settings'];
        $payload = ['company_id' => $companyId, 'tables' => []];
        foreach ($tables as $table) {
            if (! DB::getSchemaBuilder()->hasTable($table)) {
                continue;
            }
            $query = DB::table($table);
            if (DB::getSchemaBuilder()->hasColumn($table, 'company_id')) {
                $query->where('company_id', $companyId);
            }
            $payload['tables'][$table] = $query->limit(5000)->get();
        }

        return $payload;
    }
}
