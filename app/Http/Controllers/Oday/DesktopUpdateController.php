<?php

namespace App\Http\Controllers\Oday;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class DesktopUpdateController extends Controller
{
    public function version(): JsonResponse
    {
        $manifest = public_path('desktop-updates/version.json');
        $feed = trim((string) config('oday.desktop.feed_url'));
        if ($feed === '') {
            $feed = rtrim((string) config('app.url'), '/').'/desktop-updates';
        }

        $payload = [
            'available' => false,
            'version' => null,
            'feed' => $feed,
        ];

        if (is_file($manifest)) {
            $decoded = json_decode((string) file_get_contents($manifest), true);
            if (is_array($decoded)) {
                $payload = array_merge($payload, $decoded);
            }
        }

        $version = isset($payload['version']) ? trim((string) $payload['version']) : '';
        $payload['version'] = $version !== '' ? $version : null;
        $payload['available'] = $payload['version'] !== null;
        $payload['feed'] = rtrim($feed, '/');

        return response()->json($payload);
    }
}
