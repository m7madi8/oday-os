<?php

namespace App\Services\Oday\Backup;

use Illuminate\Support\Facades\File;

final class BackupLocalPathValidator
{
    public function validate(string $path, int $requiredBytes = 50_000_000): array
    {
        $path = $this->normalize($path);
        if ($path === null) {
            return ['ok' => false, 'message' => 'المسار غير صالح'];
        }

        if (! $this->isAbsolute($path)) {
            return ['ok' => false, 'message' => 'يجب أن يكون المسار مطلقاً'];
        }

        if ($this->hasTraversal($path)) {
            return ['ok' => false, 'message' => 'مسار غير مسموح'];
        }

        try {
            if (! File::isDirectory($path)) {
                File::ensureDirectoryExists($path);
            }
        } catch (\Throwable) {
            return ['ok' => false, 'message' => 'تعذر إنشاء المجلد'];
        }

        if (! is_writable($path)) {
            return ['ok' => false, 'message' => 'المجلد غير قابل للكتابة'];
        }

        $free = @disk_free_space($path);
        if ($free !== false && $free < $requiredBytes) {
            return ['ok' => false, 'message' => 'مساحة القرص غير كافية'];
        }

        return ['ok' => true, 'path' => $path];
    }

    public function normalize(?string $path): ?string
    {
        if (! is_string($path)) {
            return null;
        }
        $trimmed = trim($path);
        if ($trimmed === '') {
            return null;
        }

        $resolved = realpath($trimmed) ?: $trimmed;

        return str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $resolved);
    }

    private function isAbsolute(string $path): bool
    {
        if (DIRECTORY_SEPARATOR === '\\') {
            return (bool) preg_match('/^[A-Za-z]:[\\\\\\/]/', $path) || str_starts_with($path, '\\\\');
        }

        return str_starts_with($path, '/');
    }

    private function hasTraversal(string $path): bool
    {
        return str_contains($path, '..');
    }
}
