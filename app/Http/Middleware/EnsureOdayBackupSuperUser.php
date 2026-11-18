<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * ODAY OS — backup restore, settings, and destructive backup operations require company owner or admin.
 */
class EnsureOdayBackupSuperUser
{
    public function handle(Request $request, Closure $next)
    {
        $user = auth()->user();

        if (! $user || ! $user->isSuperUser()) {
            abort(403, 'لا صلاحية لإدارة النسخ الاحتياطي');
        }

        return $next($request);
    }
}
