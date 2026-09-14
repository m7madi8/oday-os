<?php

/**
 * نظام عدي أبو ضحى — مخزن لوحة التحكم.
 */

namespace App\Services;

use Illuminate\Support\Facades\File;

class OdayDashboardStore
{
    public function all(): array
    {
        return $this->read();
    }

    public function put(string $key, string $value, int $updatedAt): array
    {
        $data = $this->mutate(function (array $items) use ($key, $value, $updatedAt) {
            $current = (int) ($items[$key]['updated_at'] ?? 0);
            if ($updatedAt >= $current) {
                $items[$key] = [
                    'value' => $value,
                    'updated_at' => $updatedAt,
                ];
            }

            return $items;
        });

        return $data[$key];
    }

    private function mutate(callable $callback): array
    {
        $path = $this->path();
        File::ensureDirectoryExists(dirname($path));

        $handle = fopen($path, File::exists($path) ? 'c+' : 'w+');
        if ($handle === false) {
            throw new \RuntimeException('Could not open dashboard store.');
        }

        try {
            flock($handle, LOCK_EX);
            rewind($handle);
            $raw = stream_get_contents($handle);
            $items = $this->decode(is_string($raw) ? $raw : '');
            $items = $callback($items);
            ftruncate($handle, 0);
            rewind($handle);
            fwrite($handle, json_encode($items, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
            fflush($handle);

            return $items;
        } finally {
            flock($handle, LOCK_UN);
            fclose($handle);
        }
    }

    private function read(): array
    {
        $path = $this->path();
        if (! File::exists($path)) {
            return [];
        }

        return $this->decode((string) File::get($path));
    }

    private function decode(string $raw): array
    {
        if (trim($raw) === '') {
            return [];
        }

        $decoded = json_decode($raw, true);

        return is_array($decoded) ? $decoded : [];
    }

    private function path(): string
    {
        return storage_path('app/oday/dashboard.json');
    }
}
