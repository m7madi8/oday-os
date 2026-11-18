# Phase 1 — Execution Report

Date: 2026-11-18  
Scope: block unsafe backup restore. No new product feature. No deploy. No commit. No migration.

## A. Initial findings

Restore had one application entry point.

1. Dashboard `BackupPanel` called `restoreBackupRun(runId)`.
2. `dashboard/src/lib/api/backup.js` sent `POST /api/backup/restore` with `{ run_id, confirm: true }`.
3. `routes/backup.php` maps that POST through `api`, `throttle:api`, `token_auth`, `locale`, and `oday.backup.superuser`.
4. `OdayBackupController::restore` required `run_id` and `confirm`, then called `BackupRestoreService::restoreFromRun`.
5. The service loaded `OdayBackupRun` for the current company, copied the encrypted file into a safety folder, decrypted it, checked `manifest.json` `company_id`, wrote dashboard JSON, then executed `database.sql`.

`BackupArchiveBuilder::writeDatabaseDump()` builds that SQL with `mysqldump` of the whole MySQL database (`--routines --triggers`), not a company filter.

No mobile caller and no Artisan command called `BackupRestoreService`. Invoice Ninja bulk `action=restore` routes archive individual entities. They do not execute this dump.

Authorization before the fix:

- Missing token: `TokenAuth` returns 403 `Invalid token` before the controller.
- Authenticated non-admin: `EnsureOdayBackupSuperUser` returns 403.
- Owner or company admin: restore ran.

A matching manifest company id did not make the SQL company-scoped. `DB::unprepared($sql)` is not protected by a Laravel transaction, and foreign keys were turned off. A failed statement could leave a partial database. The old controller also appended `$e->getMessage()` to the JSON error.

## B. Verified risks

| Risk | Verdict |
|---|---|
| Restore executes a complete SQL dump | Confirmed, then removed |
| Dump can contain every company in the database | Confirmed by `mysqldump` of `$database` |
| Manifest company check restricts restored rows | Not true for the SQL payload |
| Foreign keys disabled | Confirmed, then removed |
| Unrelated data can be overwritten | Confirmed for the old path |
| Failed restore can stop mid-script | Confirmed for `unprepared` without a surrounding transaction |
| Unauthorized users can restore | Not confirmed. Middleware already blocked them. |
| Another ODAY entry point executes the dump | Not found |

Cheque clearing, invoice payment creation, expense creation, and payroll expense creation were inspected and not changed. `OdayChequePaymentService::clear()` still casts amounts with `(float)` and then calls `PaymentRepository::save()`. That is `ODAY-P1-002`, not a second Phase 1 patch. It is not a direct full-database overwrite.

## C. Changes made

| File | Why |
|---|---|
| `app/Services/Oday/Backup/BackupRestoreService.php` | `restoreFromRun()` now throws `BackupRestoreUnavailable` immediately. The decrypt, dashboard write, safety copy, and `DB::unprepared` path were removed. |
| `app/Services/Oday/Backup/BackupRestoreUnavailable.php` | Stable error type and code `restore_disabled`. |
| `app/Http/Controllers/Oday/OdayBackupController.php` | Confirmed restore returns HTTP 409 and `code: restore_disabled`. Raw exception text is no longer returned. Validation and the `confirm=false` 422 response stay. |
| `dashboard/src/components/backup/BackupPanel.jsx` | The restore confirmation action was removed. The row shows a disabled control: «الاستعادة غير متاحة». Download, retry, and manual backup controls were not redesigned. |
| `dashboard/src/lib/api/backup.js` | `restoreBackupRun()` no longer sends the POST. It rejects locally. |
| `tests/Unit/Oday/BackupRestoreBlockedTest.php` | New regression tests. |
| `tests/Unit/Oday/BackupAuthorizationApiTest.php` | The already-untracked foreign-run case now expects 409. This file was not executed in Phase 1. |

`BackupEngine`, `BackupArchiveBuilder`, download, scheduler, encryption checks, and `routes/backup.php` were not changed in this phase. Pre-existing local edits in those files remain.

## D. Security impact

An owner, admin, or direct caller of `BackupRestoreService::restoreFromRun()` cannot replay a backup archive. The method does not read the archive, copy it, write dashboard keys, or execute SQL.

Missing-token requests still stop in `token_auth` with 403. Non-admin requests still stop in `oday.backup.superuser`. The dashboard no longer offers a control that calls restore.

Backup creation, download, retry, Google connect, and the scheduler command remain registered behind their previous middleware. Their code paths were not switched over to the restore exception.

What remains unsafe if someone later reintroduces `unprepared` on `database.sql`: the archive format is still a full database dump (`ODAY-P1-009`). Phase 1 does not add a safe replacement.

## E. Regression testing

Executed with PHPUnit 11.5.56 and PHP 8.4.24. Database variables for the process pointed at `127.0.0.1` port `9` and database name `oday_phase1_blocked`, so these tests could not open the office MySQL database.

Passed:

- `tests/Unit/Oday/BackupRestoreBlockedTest.php` — 5 tests, 25 assertions, OK in 7.4s.
  - Service throws `restore_disabled` and does not call `DB::unprepared`, `statement`, `affectingStatement`, or `File::put/copy/get`.
  - Controller returns 409 for a confirmed request and does not write.
  - `confirm=false` still returns 422.
  - `POST /api/backup/restore` without a token returns 403 `Invalid token`.
  - `POST api/backup/run`, `GET api/backup/runs/{id}/download`, and `POST api/backup/restore` stay behind `oday.backup.superuser`. `BackupEngine::run` and `BackupSchedulerService::runDueBackups` still exist.
- `tests/Unit/Oday/BackupRoutesMiddlewareTest.php`
- `tests/Unit/Oday/EnsureOdayBackupSuperUserTest.php`
- `tests/Unit/Oday/OdayBackupRequirementsTest.php`
- `tests/Unit/Oday/BackupSchedulerServiceTest.php`

The second group was 16 tests, 61 assertions, OK in 15.8s.

Not executed, and why:

| Test or check | Why it was not run |
|---|---|
| `BackupAuthorizationApiTest` | Uses `MockAccountData` and `DatabaseTransactions`. It would need the Invoice Ninja MySQL schema. The assertion was updated for 409, but the test itself was not run. |
| `ChequeApiTest`, `PayrollApiTest`, full PHPUnit suite | Same database requirement. Financial code was not changed. |
| Real `POST /api/backup/run` | Would invoke `mysqldump` and possibly Google Drive. |
| Real restore against any database | Forbidden. The new path throws before I/O. |
| Dashboard Vitest and mobile Vitest | No dependency install, and no UI behavior beyond disabling an existing control was required for the server guarantee. |
| Migrations | Forbidden for this phase. |

A test is reported as passed only if it appears in the PHPUnit OK output above.

## F. Remaining problems

- Restore stays unavailable. There is no company-safe replacement.
- New backups can still contain a full `database.sql`.
- `ODAY-P1-002` through `ODAY-P1-008` in `ISSUE_REGISTER.md` are unchanged.
- Authenticated HTTP restore through a real company token was not exercised, because that fixture writes to MySQL. The route still calls `OdayBackupController::restore`, and that method was executed directly.

## G. Phase 1 acceptance

| Criterion | Result |
|---|---|
| Unsafe database restore cannot execute | Passed. Service throws before I/O. SQL execution code is gone. |
| Block is server-side | Passed. Controller returns 409. Direct service call throws. |
| Direct API access is covered | Passed for a request with no token (403). Passed for the controller method a valid token would reach (409). Authenticated kernel test not executed. |
| Blocked operation does not write | Passed. Facade spies saw no `unprepared` and no file write. |
| Backup create and download routes remain | Passed by route and method assertions. A live backup was not created. |
| Encryption and scheduler code remain | Passed by `OdayBackupRequirementsTest` and `BackupSchedulerServiceTest`. |
| No unrelated module rewritten | Passed. Cheque, payroll, report, and Invoice Ninja core files were not edited by this phase. |
| Documented | Passed. This file, `PHASE_0_BASELINE.md`, and `ISSUE_REGISTER.md`. |

Phase 1 status: **COMPLETE** for disabling unsafe restore. Live backup generation and the database-backed authorization feature test remain **not executed**.

## H. Next phase preparation

Phase 2 should start with financial correctness, not a new restore design.

1. `ODAY-P1-002` — stop casting cheque amounts to `float` in `OdayChequePaymentService::clear()`, and define the transaction boundary around payment creation and the cheque status write.
2. `ODAY-P1-003` — replace the 500-row browser totals in `Reports.jsx` / `reportMetrics.js` with server aggregates.
3. `ODAY-P1-004` and `ODAY-P1-005` — decimal strings on invoice and expense create, and pass `project_id` when the existing expense API already supports it.

Do not re-enable `POST /api/backup/restore` in Phase 2. Archive redesign is `ODAY-P1-009` and depends on a company-scoped format that does not replay a full `mysqldump`.
