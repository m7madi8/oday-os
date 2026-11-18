<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * When REQUIRE_HTTPS is true, API calls over plain HTTP are refused.
 * Local and test environments leave the flag false. A reverse proxy must
 * send X-Forwarded-Proto and be listed in TRUSTED_PROXIES before this
 * check treats the request as HTTPS.
 */
class RequireHttps
{
    public function handle(Request $request, Closure $next)
    {
        if (! filter_var(config('ninja.require_https'), FILTER_VALIDATE_BOOLEAN)) {
            return $next($request);
        }

        if ($request->isSecure()) {
            return $next($request);
        }

        if ($request->expectsJson() || $request->is('api/*')) {
            return response()->json(['message' => 'يلزم الاتصال عبر HTTPS.'], 426);
        }

        return redirect()->secure($request->getRequestUri());
    }
}
