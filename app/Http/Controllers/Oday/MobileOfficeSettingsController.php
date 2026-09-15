<?php

/**
 * نظام عدي أبو ضحى — قراءة إعدادات المكتب من مخزن اللوحة.
 */

namespace App\Http\Controllers\Oday;

use App\Http\Controllers\Controller;
use App\Services\OdayDashboardStore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MobileOfficeSettingsController extends Controller
{
    public function show(OdayDashboardStore $store): JsonResponse
    {
        $row = $store->all()['office-settings'] ?? null;
        $raw = $row['value'] ?? null;
        $settings = [];

        if (is_string($raw) && $raw !== '') {
            $decoded = json_decode($raw, true);
            $settings = is_array($decoded) ? $decoded : [];
        }

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
        $row = $store->put('office-settings', $value, $updatedAt);
        $decoded = json_decode($row['value'] ?? '', true);

        return response()->json([
            'settings' => is_array($decoded) ? $decoded : $settings,
            'updated_at' => $row['updated_at'] ?? $updatedAt,
        ]);
    }
}
