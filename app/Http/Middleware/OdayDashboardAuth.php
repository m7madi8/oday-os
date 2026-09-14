<?php

/**
 * نظام عدي أبو ضحى — مصادقة واجهة لوحة التحكم.
 */

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class OdayDashboardAuth
{
    public function handle(Request $request, Closure $next)
    {
        $expected = (string) config('oday.dashboard_token');
        $given = (string) $request->header('X-ODAY-TOKEN', '');

        if ($expected === '' || ! hash_equals($expected, $given)) {
            return response()->json(['message' => 'unauthorized'], 401);
        }

        return $next($request);
    }
}
