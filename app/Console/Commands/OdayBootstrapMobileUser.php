<?php

/**
 * نظام عدي أبو ضحى — إنشاء/تحديث حساب الجوال الافتراضي.
 */

namespace App\Console\Commands;

use App\DataMapper\CompanySettings;
use App\Jobs\Company\CreateCompanyToken;
use App\Models\Company;
use App\Models\CompanyToken;
use App\Models\CompanyUser;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class OdayBootstrapMobileUser extends Command
{
    protected $signature = 'oday:bootstrap-mobile-user
                            {--email=oday@oday.local : Login email}
                            {--password=oday : Login password}
                            {--reset : Reset password if user already exists}';

    protected $description = 'Ensure the default ODAY mobile login user exists';

    public function handle(): int
    {
        $email = (string) $this->option('email');
        $password = (string) $this->option('password');

        $user = User::query()
            ->where('email', $email)
            ->where('is_deleted', 0)
            ->whereNull('deleted_at')
            ->first();

        if ($user) {
            $company = Company::query()->orderBy('id')->first();
            if (! $company) {
                $this->error('No company found. Run setup first: http://127.0.0.1:8000/setup');

                return self::FAILURE;
            }

            if ($this->option('reset')) {
                $user->password = Hash::make($password);
                $user->save();
                $this->info("Updated password for {$email}");
            } else {
                $this->info("User already exists: {$email}");
            }

            $this->ensureCompanyAccess($user, $company);

            return self::SUCCESS;
        }

        $company = Company::query()->orderBy('id')->first();
        if (! $company) {
            $this->error('No company found. Run setup first: http://127.0.0.1:8000/setup');

            return self::FAILURE;
        }

        $accountId = $company->account_id;
        $user = User::factory()->create([
            'account_id' => $accountId,
            'email' => $email,
            'password' => Hash::make($password),
            'first_name' => 'عدي',
            'last_name' => 'أبو ضحى',
            'phone' => '',
            'email_verified_at' => now(),
            'is_deleted' => 0,
        ]);

        $user->companies()->attach($company->id, [
            'account_id' => $accountId,
            'is_owner' => 0,
            'is_admin' => 1,
            'is_locked' => 0,
            'notifications' => CompanySettings::notificationDefaults(),
            'settings' => null,
        ]);

        (new CreateCompanyToken($company, $user, 'ODAY Mobile'))->handle();

        $this->ensureCompanyAccess($user, $company);

        $this->info("Created mobile user: {$email}");
        $this->line("Password: {$password}");

        return self::SUCCESS;
    }

    private function ensureCompanyAccess(User $user, Company $company): void
    {
        $companyUser = CompanyUser::query()
            ->where('user_id', $user->id)
            ->where('company_id', $company->id)
            ->first();

        if (! $companyUser) {
            $user->companies()->attach($company->id, [
                'account_id' => $company->account_id,
                'is_owner' => 0,
                'is_admin' => 1,
                'is_locked' => 0,
                'notifications' => CompanySettings::notificationDefaults(),
                'settings' => null,
            ]);
            $this->info('Linked user to company.');
        } elseif ($companyUser->is_locked) {
            $companyUser->is_locked = 0;
            $companyUser->save();
            $this->info('Unlocked company user.');
        }

        $token = CompanyToken::query()
            ->where('company_id', $company->id)
            ->where('user_id', $user->id)
            ->where('is_system', true)
            ->first();

        if (! $token) {
            (new CreateCompanyToken($company, $user, 'ODAY Mobile'))->handle();
            $this->info('Created mobile API token.');
        }
    }
}
