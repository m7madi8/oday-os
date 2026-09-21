<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class VerifyCronSecret
{
    public function handle(Request $request, Closure $next)
    {
        $expected = (string) config('oday.backup.cron_secret');
        $given = (string) $request->header('X-CRON-SECRET', '');

        if ($expected === '' || ! hash_equals($expected, $given)) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        return $next($request);
    }
}
