<?php

/**
 * نظام عدي أبو ضحى — واجهة مزامنة لوحة التحكم.
 */

namespace App\Http\Controllers;

use App\Services\OdayDashboardStore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OdayDashboardController extends Controller
{
    public function index(OdayDashboardStore $store): JsonResponse
    {
        return response()->json(['items' => $store->all()]);
    }

    public function show(string $key, OdayDashboardStore $store): JsonResponse
    {
        if ($error = $this->invalidKey($key)) {
            return $error;
        }

        $row = $store->all()[$key] ?? null;

        return response()->json([
            'key' => $key,
            'value' => $row['value'] ?? null,
            'updated_at' => $row['updated_at'] ?? null,
        ]);
    }

    public function upsert(string $key, Request $request, OdayDashboardStore $store): JsonResponse
    {
        if ($error = $this->invalidKey($key)) {
            return $error;
        }

        $value = $request->input('value');
        if ($value === null) {
            $value = '';
        }
        if (! is_string($value)) {
            return response()->json(['message' => 'value must be a string'], 422);
        }
        if (strlen($value) > 200000) {
            return response()->json(['message' => 'value too large'], 422);
        }

        $updatedAt = (int) $request->input('updated_at', (int) round(microtime(true) * 1000));
        $row = $store->put($key, $value, $updatedAt);

        return response()->json([
            'key' => $key,
            'value' => $row['value'],
            'updated_at' => $row['updated_at'],
        ]);
    }

    private function invalidKey(string $key): ?JsonResponse
    {
        if (! preg_match('/^[A-Za-z0-9._-]{1,64}$/', $key)) {
            return response()->json(['message' => 'invalid key'], 422);
        }

        return null;
    }
}
