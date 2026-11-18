# Phase 0 — Project Baseline

Date: 2026-11-18  
Branch: `main` at `0b7f7ae` (`origin/main`)  
HEAD: `Show cheque essentials only and remove visual preview panels.`

This document records the repository as found before Phase 1. No reset, stash, commit, or deploy was performed.

## Repository state

The working tree was already dirty. Those changes were left in place. Phase 1 only touched the restore path, its dashboard control, one existing untracked assertion, and these stabilization documents.

Recent commits on `main`:

- `0b7f7ae` Show cheque essentials only and remove visual preview panels.
- `3a929b8` Add simple receipt vouchers page for cash and incoming cheques.
- `5780d69` Add dashboard notes layout with configurable client spotlight.
- `989de78` Wire project service types to office settings and expand reports dashboard.
- `1b97f60` dashboard release
- `c62e46a` tag `v1.0.4` — AI sidebar placeholder
- `08ca3f8` tag `v1.0.3` — electron-updater Windows fix
- `0832eda` tag `v1.0.2` — Palestinian banks registry

### Pre-existing local modifications (not introduced by Phase 1)

Modified:

- `.env.example`
- `app/Http/Controllers/Oday/OdayBackupController.php` (Phase 1 later edited `restore()` only)
- `app/Http/Controllers/SetupController.php`
- `app/Http/Kernel.php`
- `app/Http/Middleware/ApiSecretCheck.php`
- `app/Providers/OdayServiceProvider.php`
- `app/Services/Oday/Backup/BackupEncryption.php`
- `app/Services/Oday/Backup/BackupEngine.php`
- `app/Services/Oday/Backup/BackupGoogleDriveService.php`
- `app/Services/Oday/Backup/BackupRestoreService.php` (Phase 1 later replaced the unsafe body)
- `app/Services/Oday/Backup/BackupSchedulerService.php`
- `app/Services/Oday/Cheque/OdayChequeService.php`
- `app/Services/Oday/OdayChequePaymentService.php`
- `app/Services/Oday/Payroll/OdayPayrollService.php`
- `config/oday.php`
- `dashboard/.env.example`
- `dashboard/server/odaySyncPlugin.js`
- `dashboard/src/lib/api/client.js`
- `dashboard/src/lib/auth/AuthProvider.jsx`
- `dashboard/src/lib/auth/session.js`
- `dashboard/src/pages/LoginScreen.jsx`
- `oday-mobile/app/(auth)/login.tsx`
- `oday-mobile/lib/api/client.ts`
- `oday-mobile/lib/auth/AuthProvider.tsx`
- `oday-mobile/lib/auth/office.ts`
- `oday-mobile/package-lock.json`
- `oday-mobile/package.json`
- `routes/backup.php`
- `tests/Feature/Oday/ChequeApiTest.php`

Untracked before Phase 1 (still untracked; not committed):

- `app/Http/Middleware/EnsureOdayBackupSuperUser.php`
- `app/Services/Oday/Backup/BackupRunner.php`
- `app/Services/Oday/Backup/BackupScheduleEligibility.php`
- `app/Services/Oday/Backup/OdayBackupRequirements.php`
- `app/Services/Oday/OdayDashboardTokenGuard.php`
- `dashboard/src/lib/api/__tests__/`
- `dashboard/src/lib/auth/__tests__/`
- `dashboard/src/lib/auth/office.js`
- `oday-mobile/lib/auth/__tests__/`
- `oday-mobile/vitest.config.ts`
- `tests/Feature/Oday/OdayDashboardSyncAuthTest.php`
- `tests/Unit/Oday/ApiSecretCheckTest.php`
- `tests/Unit/Oday/BackupAuthorizationApiTest.php` (Phase 1 updated the restore assertion)
- `tests/Unit/Oday/BackupCronApiTest.php`
- `tests/Unit/Oday/BackupGoogleOAuthStateTest.php`
- `tests/Unit/Oday/BackupRoutesMiddlewareTest.php`
- `tests/Unit/Oday/BackupScheduleEligibilityTest.php`
- `tests/Unit/Oday/BackupSchedulerServiceTest.php`
- `tests/Unit/Oday/BackupSettingsApiTest.php`
- `tests/Unit/Oday/EnsureOdayBackupSuperUserTest.php`
- `tests/Unit/Oday/OdayBackupRequirementsTest.php`
- `tests/Unit/Oday/OdayDashboardTokenGuardTest.php`
- `tests/Unit/Oday/OdaySecretsExampleFilesTest.php`
- `tests/Unit/Oday/OdayServiceProviderBootTest.php`
- `tests/Unit/Oday/SetupUpdateSecretTest.php`
- `tests/Unit/Oday/VerifyCronSecretTest.php`

No staged changes were present.

## Architecture summary

ODAY OS is Invoice Ninja v5 (Laravel 12, PHP `^8.2`) with an office layer. Invoice Ninja remains the system of record for clients, projects, invoices, payments, expenses, documents, and company tokens.

Custom ODAY boundaries:

- Routes: `routes/oday.php`, `routes/backup.php`, plus cheque and payroll routes inside `routes/api.php`.
- Controllers: `app/Http/Controllers/Oday/` and `OdayDashboardController`.
- Services: `app/Services/Oday/`.
- Models: `OdayCheque`, `OdayChequeStatusHistory`, `OdayEmployee`, `OdayPayrollPayment`, backup models, cheque print/logo/template models.
- Migrations: `database/migrations/2026_09_14_000000_create_oday_cheques_table.php` through `2026_09_21_150000_create_oday_employees_tables.php`.
- Dashboard: `dashboard/` — React 18, Vite 5, Tailwind, TanStack Query, in-app page state in `dashboard/src/App.jsx`.
- Desktop: `dashboard/electron/` — Electron 33, `contextIsolation`, no `nodeIntegration`.
- Mobile: `oday-mobile/` — Expo SDK 57, Expo Router, `expo-secure-store` on native.

Authentication for the dashboard and mobile uses Invoice Ninja company tokens (`X-API-TOKEN`) via `token_auth`. A legacy key-value sync route `/api/oday/items` uses a shared `X-ODAY-TOKEN`. Backup management routes use `token_auth` plus `oday.backup.superuser`.

Backup creation lives in `BackupEngine` and `BackupArchiveBuilder`. Restore lived only in `BackupRestoreService`, called from `OdayBackupController::restore`.

## Application inventory

Implemented and connected in code, not runtime-verified in Phase 0:

- Clients, projects, invoices, payments, expenses through Invoice Ninja `/api/v1`.
- Cheques: create, update, status transition, soft delete, print templates, bank logos.
- Payroll employees and payments that create Invoice Ninja expenses.
- Dashboard key-value sync for notes, office settings, and dead debts.
- Backup settings, manual run, download, Google Drive, local copy, scheduler command `oday:backup-run-scheduled`.
- Mobile overview, finance screens, and AI chat when `ODAY_AI_API_KEY` is set.

Incomplete or placeholder, left untouched:

- Web AI screen is a placeholder (`dashboard/src/pages/AiAssistant.jsx`).
- Web dashboard is notes and shortcuts, not the mobile KPI overview.
- Invoice and expense screens create records; they do not edit or delete them.
- Expense creation from the dashboard does not send `project_id`.
- Reports aggregate in the browser from at most 500 rows per resource.
- Cheques and documents are reachable, but cheques are not in `NAV_GROUPS`.

## Dependency overview

- PHP backend: `composer.json` — Laravel 12 and the Invoice Ninja payment, PDF, and mail stack. No new Composer packages were added.
- Dashboard: `dashboard/package.json` — React 18.3, Vite 5.4, Electron 33, electron-builder, Vitest. No GSAP or Framer Motion.
- Mobile: `oday-mobile/package.json` — Expo ~57, React 19, React Native 0.86.
- Database example: MySQL in `.env.example` and `docker-compose.yml` (MySQL only).
- Desktop installer artifact exists at `dashboard/release/ODAY-OS-Setup.exe`. It was not launched.

## Existing test coverage

- ODAY PHPUnit feature tests: `tests/Feature/Oday/ChequeApiTest.php`, `PayrollApiTest.php`, `OdayDashboardSyncAuthTest.php`.
- ODAY PHPUnit unit tests under `tests/Unit/Oday/` for backup auth, cron, scheduler, cheque money, and secrets.
- Dashboard Vitest under `dashboard/src/**/__tests__/`.
- Mobile Vitest: `oday-mobile/lib/auth/__tests__/office.test.ts`.
- `tests/e2e` is Invoice Ninja client-portal coverage, not the ODAY dashboard.

## Baseline validation results

| Check | Result |
|---|---|
| `git status`, `git branch`, `git log` | Passed. Dirty tree documented above. |
| `php -v` | Passed. PHP 8.4.24. |
| `vendor/autoload.php` and PHPUnit 11.5.56 | Present. Not installed during this phase. |
| Migrations | Not executed. |
| Full PHPUnit suite | Not executed. Feature tests use `DatabaseTransactions` and `MockAccountData` against MySQL connection `db-ninja-03`. |
| Dashboard `npm test` | Not executed. Dependencies were not installed. |
| Mobile `npm test` | Not executed. |
| Backup creation against Drive or disk | Not executed. |
| Phase 1 targeted PHPUnit | Executed after the fix. See `PHASE_1_EXECUTION_REPORT.md`. |

## Environmental limitations

- `phpunit.xml` sets `DB_CONNECTION=db-ninja-03` and `DB_DATABASE=:memory:`, but `config/database.php` defines `db-ninja-03` as MySQL. `:memory:` is not a SQLite database in this setup.
- Phase 1 tests were run with database host port `9` and a non-existent database name so a connection could not reach the office MySQL database.
- No production data was read or modified.
- Docker was not started. The desktop installer was not run. The Expo app was not started.
