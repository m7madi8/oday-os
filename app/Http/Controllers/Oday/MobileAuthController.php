<?php

/**
 * نظام عدي أبو ضحى — مصادقة الجوال عبر توكن Invoice Ninja.
 */

namespace App\Http\Controllers\Oday;

use App\Events\User\UserLoggedIn;
use App\Http\Controllers\Controller;
use App\Jobs\Company\CreateCompanyToken;
use App\Libraries\MultiDB;
use App\Models\CompanyToken;
use App\Models\CompanyUser;
use App\Models\User;
use App\Utils\Ninja;
use App\Utils\Traits\MakesHash;
use App\Utils\TruthSource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use PragmaRX\Google2FA\Google2FA;

class MobileAuthController extends Controller
{
    use MakesHash;

    public function precheck(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|string|max:255',
        ]);

        $started = microtime(true);
        $methods = ['password'];

        $user = $this->findOfficeUser((string) $request->input('email'));

        if ($user && $user->google_2fa_secret) {
            $methods[] = 'totp';
        }

        $elapsed = (microtime(true) - $started) * 1000;
        if ($elapsed < 250) {
            usleep((int) ((250 - $elapsed) * 1000));
        }

        return response()->json([
            'methods' => $methods,
            'totp_required' => in_array('totp', $methods, true),
        ]);
    }

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|string|max:255',
            'password' => 'required|string|max:1000',
            'one_time_password' => 'nullable|string|max:32',
        ]);

        $user = $this->findOfficeUser((string) $request->input('email'));

        if (! $user || ! Hash::check((string) $request->input('password'), (string) $user->password)) {
            return response()->json(['message' => 'بيانات الدخول غير صحيحة'], 401);
        }

        if ($user->google_2fa_secret) {
            $otp = (string) $request->input('one_time_password', '');
            if ($otp === '') {
                return response()->json([
                    'message' => 'رمز التحقق مطلوب',
                    'totp_required' => true,
                ], 400);
            }

            $google2fa = new Google2FA();
            if (! $google2fa->verifyKey(decrypt($user->google_2fa_secret), $otp)) {
                return response()->json(['message' => 'رمز التحقق غير صحيح'], 422);
            }
        }

        Auth::setUser($user);

        $companyUser = CompanyUser::query()
            ->where('user_id', $user->id)
            ->where('is_locked', false)
            ->first();

        if (! $companyUser) {
            return response()->json(['message' => 'المستخدم غير مرتبط بأي شركة'], 400);
        }

        $company = $companyUser->company;
        $user->setCompany($company);

        $token = CompanyToken::query()
            ->where('company_id', $company->id)
            ->where('user_id', $user->id)
            ->where('is_system', true)
            ->first();

        if (! $token) {
            $token = (new CreateCompanyToken($company, $user, 'ODAY Mobile'))->handle();
        }

        if (! $token) {
            return response()->json(['message' => 'تعذر إصدار رمز الدخول'], 500);
        }

        $truth = app()->make(TruthSource::class);
        $truth->setCompanyUser($companyUser);
        $truth->setUser($user);
        $truth->setCompany($company);
        $truth->setCompanyToken($token);

        event(new UserLoggedIn($user, $company, Ninja::eventVars($user->id)));

        $settings = $company->settings;

        return response()->json([
            'token' => $token->token,
            'user' => [
                'id' => $this->encodePrimaryKey($user->id),
                'email' => $user->email,
                'first_name' => $user->first_name ?: '',
                'last_name' => $user->last_name ?: '',
                'is_admin' => (bool) $companyUser->is_admin,
                'is_owner' => (bool) $companyUser->is_owner,
                'permissions' => (string) ($companyUser->permissions ?: ''),
            ],
            'company' => [
                'id' => $this->encodePrimaryKey($company->id),
                'name' => (string) ($settings->name ?: $company->present()->name()),
                'currency_id' => (string) ($settings->currency_id ?? '1'),
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        // Mobile logout is local: do not rotate company system tokens
        // (that would sign out the web admin as well).
        unset($request);

        return response()->json(['message' => 'تم تسجيل الخروج']);
    }

    public function session(): JsonResponse
    {
        /** @var User $user */
        $user = auth()->user();
        $company = $user->company();
        $companyUser = $user->co_user();
        $settings = $company->settings;

        return response()->json([
            'user' => [
                'id' => $this->encodePrimaryKey($user->id),
                'email' => $user->email,
                'first_name' => $user->first_name ?: '',
                'last_name' => $user->last_name ?: '',
                'is_admin' => (bool) $companyUser->is_admin,
                'is_owner' => (bool) $companyUser->is_owner,
                'permissions' => (string) ($companyUser->permissions ?: ''),
            ],
            'company' => [
                'id' => $this->encodePrimaryKey($company->id),
                'name' => (string) ($settings->name ?: $company->present()->name()),
                'currency_id' => (string) ($settings->currency_id ?? '1'),
            ],
        ]);
    }

    private function findOfficeUser(string $identifier): ?User
    {
        $identifier = trim($identifier);
        if ($identifier === '') {
            return null;
        }

        $user = MultiDB::hasUser([
            'email' => $identifier,
            'is_deleted' => 0,
            'deleted_at' => null,
        ]);

        if ($user) {
            return $user;
        }

        if (str_contains($identifier, '@')) {
            return null;
        }

        $matchUsername = function () use ($identifier) {
            return User::query()
                ->where('is_deleted', 0)
                ->whereNull('deleted_at')
                ->where('email', 'like', $identifier.'@%')
                ->first();
        };

        if (! config('ninja.db.multi_db_enabled')) {
            return $matchUsername();
        }

        $current = config('database.default');
        foreach (MultiDB::$dbs as $db) {
            MultiDB::setDB($db);
            $found = $matchUsername();
            if ($found) {
                return $found;
            }
        }

        MultiDB::setDB($current);

        return null;
    }
}
