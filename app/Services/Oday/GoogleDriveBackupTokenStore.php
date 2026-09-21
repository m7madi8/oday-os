<?php

namespace App\Services\Oday;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\File;

class GoogleDriveBackupTokenStore
{
    public function save(int $companyId, array $payload): void
    {
        File::ensureDirectoryExists($this->directory());
        File::put($this->path($companyId), Crypt::encryptString(json_encode($payload, JSON_UNESCAPED_UNICODE)));
    }

    public function read(int $companyId): ?array
    {
        $path = $this->path($companyId);
        if (! File::exists($path)) {
            return null;
        }

        try {
            $decoded = json_decode(Crypt::decryptString((string) File::get($path)), true);

            return is_array($decoded) ? $decoded : null;
        } catch (\Throwable) {
            return null;
        }
    }

    public function delete(int $companyId): void
    {
        $path = $this->path($companyId);
        if (File::exists($path)) {
            File::delete($path);
        }
    }

    private function directory(): string
    {
        return storage_path('app/oday/private/google-drive');
    }

    private function path(int $companyId): string
    {
        return $this->directory().'/company-'.$companyId.'.token';
    }
}
