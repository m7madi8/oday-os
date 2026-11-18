<?php

/**
 * نظام عدي أبو ضحى — قراءة إعدادات المكتب من مخزن اللوحة.
 */

namespace App\Http\Controllers\Oday;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Services\OdayDashboardStore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MobileOfficeSettingsController extends Controller
{
    public function show(OdayDashboardStore $store): JsonResponse
    {
        $row = $this->rowForActingCompany($store);
        $settings = $this->decode($row['value'] ?? null);

        return response()->json([
            'settings' => $settings,
            'updated_at' => $row['updated_at'] ?? null,
        ]);
    }

    public function update(Request $request, OdayDashboardStore $store): JsonResponse
    {
        $request->validate([
            'settings' => 'required|array',
        ]);

        $settings = $request->input('settings');
        $value = json_encode($settings, JSON_UNESCAPED_UNICODE);
        if (! is_string($value) || strlen($value) > 200000) {
            return response()->json(['message' => 'تعذر حفظ الإعدادات'], 422);
        }

        $updatedAt = (int) $request->input('updated_at', (int) round(microtime(true) * 1000));
        $row = $store->put($this->scopedKey(), $value, $updatedAt);
        $decoded = json_decode($row['value'] ?? '', true);

        return response()->json([
            'settings' => is_array($decoded) ? $decoded : $settings,
            'updated_at' => $row['updated_at'] ?? $updatedAt,
        ]);
    }

    /**
     * The historical `office-settings` entry has no company owner.
     * It is copied only when this installation has exactly one company.
     * Otherwise it is left untouched and is not returned.
     *
     * @return array<string, mixed>
     */
    private function rowForActingCompany(OdayDashboardStore $store): array
    {
        $items = $store->all();
        $key = $this->scopedKey();
        if (isset($items[$key]) && is_array($items[$key])) {
            return $items[$key];
        }

        $legacy = $items['office-settings'] ?? null;
        if (! is_array($legacy) || ! $this->legacyBelongsToTheOnlyCompany()) {
            return [];
        }

        $value = is_string($legacy['value'] ?? null) ? $legacy['value'] : '';
        $updatedAt = (int) ($legacy['updated_at'] ?? 0);

        return $store->put($key, $value, $updatedAt);
    }

    private function scopedKey(): string
    {
        return 'office-settings:'.(int) auth()->user()->companyId();
    }

    private function legacyBelongsToTheOnlyCompany(): bool
    {
        return Company::query()->count() === 1;
    }

    /**
     * @return array<string, mixed>
     */
    private function decode(mixed $raw): array
    {
        if (! is_string($raw) || $raw === '') {
            return [];
        }
        $decoded = json_decode($raw, true);

        return is_array($decoded) ? $decoded : [];
    }
}
