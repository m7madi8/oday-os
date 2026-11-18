# ODAY OS — Issue Register

Status values: `Open`, `Fixed in Phase 1`, `IMPLEMENTED — VERIFICATION PENDING`, `VERIFIED — CLOSED`, `BLOCKED`, `Partial`, `Not executed`.  
Phase 1 fixed `ODAY-P0-001`. Phase 2V verified the financial corrections on an isolated MySQL 8.0.46 database. Phase 3 kept that database and fixed the backup company-context failure. Phase 5 contained new backup archives, blocked download of older unscoped archives, scoped office settings, and disabled the legacy static-token sync route. Restore stays disabled. PDF privacy and disaster recovery stay blocked.

## Confirmed defects

| ID | Severity | Status | Phase | Root cause | Evidence | Affected modules | Required correction | Verification |
|---|---|---|---|---|---|---|---|---|
| ODAY-P0-001 | P0 | Fixed in Phase 1 | 1 | `BackupRestoreService` replayed `database.sql` from a full `mysqldump` after `SET FOREIGN_KEY_CHECKS=0`. Manifest `company_id` did not scope the SQL. | Previously `BackupRestoreService.php` lines 82–86 and `BackupArchiveBuilder.php` `writeDatabaseDump()`. Entry: `POST api/backup/restore`. | Backup | Refuse execution server-side. Disable the dashboard action. Do not replace restore yet. | `BackupRestoreBlockedTest` passed, 5 tests. SQL path removed. |
| ODAY-P1-002 | P1 | VERIFIED — CLOSED | 2 | Cheque clearing cast the stored amount to `float` before `PaymentRepository::save`. | MySQL `payments.amount` stored `10.10`, `1234.56`, and `1.234` with the cheque currency. A second clear did not add a payment. A forced save failure left the cheque in `processing` and added no payment. | Cheques, Payments | Closed by Phase 2V. Two overlapping HTTP clear workers were not started; a second connection could not take the row lock. | `FinancialMysqlVerificationTest` on MySQL 8.0.46, port 3307. |
| ODAY-P1-003 | P1 | VERIFIED — CLOSED | 2 | The office report summed `Number(...)` over the first 500 loaded rows. | `office-summary` matched an independent `SUM` for 1,000 payments plus the extra `0.10`. Cancelled, failed, deleted, another month, and another company were excluded. Two currencies were not added. | Reports | Closed by Phase 2V. | `test_office_summary_includes_every_eligible_row_and_keeps_currencies_apart`. |
| ODAY-P1-004 | P1 | VERIFIED — CLOSED | 2 | Invoice creation sent `Number(cost)`. | Invoice Ninja stored line cost `10.10` as invoice `amount` `10.10`. Cost `0` is accepted by the existing API and stored as zero. The dashboard still rejects zero before the request. | Invoices | No new line-item editor. | `test_invoice_and_expense_decimal_amounts_persist`. |
| ODAY-P1-005 | P1 | VERIFIED — CLOSED | 2 | Expense creation sent `Number(amount)`. The create form has no project field. | Expense `1234.56` and payroll expense `10.10` persisted. A second pay for the same period returned 422 and did not add a second expense. | Expenses | Project selection stays out of scope as `ODAY-P1-005-project`. | `test_invoice_and_expense_decimal_amounts_persist` and `test_payroll_expense_persists_the_decimal_amount_once`. |
| ODAY-P1-006 | P1 | Partial | REL-B1 | HTTPS middleware is enforced locally, including rejection of an untrusted `X-Forwarded-Proto`. The live proxy is still unverified. The Invoice Ninja invoice template now renders locally with `snappdf` when `SNAPPDF_CHROMIUM_PATH` has no spaces. `PDF_GENERATOR=hosted_ninja` remains the example so a workstation without Chromium still boots. Windows paths that contain spaces still fail inside Snappdf. Vendor code was not patched. | `REL_B1_INVOICE_PDF_VERIFICATION.md` | Deployment, PDF, HTTPS | Production must set `snappdf` and a space-free Chromium path. Do not treat the isolated PDF as proof of the production server. HTTPS stays open. | Isolated invoice PDF: `%PDF-1.4`, one page, `NIS 1,234.56`, Arabic labels visible. `BackupRestoreBlockedTest` still passes. |
| ODAY-P1-007 | P1 | VERIFIED — CLOSED | 5 | `/api/oday/items` authorized with a shared static token and no company scope. React, Electron, and Expo use `/api/oday/mobile/*` with the user token. The Vite dev plugin does not call Laravel. | `routes/oday.php`, `OdayDashboardSyncAuthTest` | Legacy sync | `GET/PUT/POST/DELETE` on `api/oday/items` and `api/oday/items/{key}` return HTTP 410 `legacy_sync_disabled`. Mobile item routes stay. | `OdayDashboardSyncAuthTest` passed with the correct static token. |
| ODAY-P1-008 | P1 | Open | 6 | Production still has no real API origin. Phase 6 removed the localhost fallback for `production` and `preview`, rejects non-HTTPS production URLs, and sets `usesCleartextTraffic` false only when `EXPO_PUBLIC_APP_ENV=production`. Development still falls back to `http://127.0.0.1:8000`. | `oday-mobile/lib/serverPolicy.ts`, `eas.json`, `app.config.js` | Mobile | Three separate states: fail-closed behavior is implemented; a production URL is not configured; a live production connection is not verified. Do not invent a host. | `serverPolicy.test.ts`. `expo config` with the production env showed cleartext false. No EAS build and no store submission. |
| ODAY-P1-009 | P1 | VERIFIED — ISOLATED RECOVERY COMPLETE / PRODUCTION VALIDATION PENDING | REL-D1 | The company download is still a limited JSON subset. `POST /api/backup/restore` stays disabled. An isolated drill restored an Invoice Ninja invoice of `1234.56` ILS, a `100.00` payment, cheque `RELD1-100`, and a local-disk attachment into a second schema. The restored application read the invoice and the file. `SHA256` matched. Production disk and secret storage are not confirmed. | `REL_D1_DISASTER_RECOVERY_VERIFICATION.md` | Backup, recovery | Keep the application endpoint disabled. Confirm the production attachment disk and the separate secret store before calling production recovery closed. | Isolated drill only. Drill schemas and the token manifest were removed after the check. |

## Potential concerns (not confirmed as active defects)

| ID | Severity | Status | Notes |
|---|---|---|---|
| ODAY-C-010 | P2 | Open | `config/cors.php` allows every origin. Tokens are headers, not cookies. |
| ODAY-C-011 | P2 | VERIFIED — CLOSED | Phase 6. Credentials are not written when `safeStorage` is unavailable. A legacy `plain:` value is purged and not returned. The current desktop session stays in renderer memory until logout. A restart requires login. Non-secret server URLs may use a `cfg:` prefix, not `plain:`. |
| ODAY-C-012 | P2 | Open | Dead debts are a JSON blob (`dashboard/src/lib/deadDebts/deadDebtStorage.js`), not ledger rows. |
| ODAY-C-013 | P2 | Open | Web AI page is a placeholder while `POST /api/oday/mobile/ai/chat` exists. |
| ODAY-C-014 | P2 | BLOCKED | Windows installer is unsigned (`signAndEditExecutable: false`). Phase 6 produced `dashboard/release-phase6/ODAY-OS-Setup.exe` and electron-builder reported that signing was skipped. The installer was not executed. |
| ODAY-C-015 | P3 | Open | `GET /api/oday/mobile/health` is public and reports database connectivity. |
| ODAY-C-016 | P3 | Open | Two Google Drive backup service classes exist. Not consolidated. |

## Confirmed after Phase 2, not closed

| ID | Severity | Status | Notes |
|---|---|---|---|
| ODAY-P2-010 | P2 | VERIFIED — CLOSED | One hundred additions of `0.10` through `updatePaidToDate('0.10')` stored `10.00` in `clients.paid_to_date` `decimal(20,6)`. The PHP `+=` was not changed because this supported-scale case did not drift. |
| ODAY-P2-011 | P2 | VERIFIED — CLOSED | Open receivables are grouped by the client currency, then the company currency. Mixed currencies return a label and a null total. Confirmed with ILS and USD balances; a cancelled balance was excluded. |
| ODAY-P2-012 | P2 | VERIFIED — CLOSED | Income now follows Invoice Ninja's recognized payment statuses: pending, completed, partially refunded, and refunded, summed as `amount - refunded`. Cancelled and failed payments are excluded. Confirmed against an independent SQL sum. |
| ODAY-P1-005-project | P2 | Open | Expense create has no project field. This is missing functionality, not a value that the form collected and then dropped. |

## Phase 3 — backend and database

| ID | Severity | Status | Root cause | Correction | Verification |
|---|---|---|---|---|---|
| ODAY-P3-001 | P1 | VERIFIED — CLOSED | `AppServiceProvider` registered `TruthSource` with `instance()`. `Queue::before` calls `forgetInstance()`. After that, the class is not a shared binding, so every `app(TruthSource::class)` builds a new empty object. `OdayBackupController::companyId()` then read `id` on null and returned HTTP 500. The authenticated user still had the company. | Register `TruthSource` as a singleton. `forgetInstance()` still clears it for the next job, and the next resolve caches one fresh instance. | `Phase3IsolationTest::test_confirmed_restore_stays_disabled_for_an_owner` returned HTTP 409 `restore_disabled`. Backup settings and the foreign-run restore check passed. |
| ODAY-P3-002 | P2 | VERIFIED — CLOSED | Assigning a document from another company reached `OdayDocumentService` and aborted 403 with a message that confirmed the document existed. | `MobileDocumentController::assignProject` returns 404 when `document.company_id` is not the acting company, before validation and before the service. | Same-company assign was not 404. Foreign document assign was 404 and `project_id` stayed null. |
| ODAY-P3-003 | P2 | VERIFIED — CLOSED | Database failure responses named port 3306 and `.env` keys. | `Handler` and `GET /api/oday/mobile/health` now say only that the database connection failed. Status stays 503. | Confirmed in source. A live database-down request was not executed. |
| ODAY-P3-004 | P1 | VERIFIED — CLOSED | The file store had one unscoped `office-settings` value. The client key name is unchanged. The server now reads and writes `office-settings:{companyId}`. The legacy value is copied only when exactly one company exists; otherwise it is not returned. | `MobileOfficeSettingsController`, `OdayDashboardController::hidesOfficeKey` | `OfficeSettingsIsolationTest`: company A did not receive the legacy blob, and the items index did not expose `office-settings`. Other item keys such as `dashboard-settings` remain global. |
| ODAY-P3-005 | P2 | Open | Invoice Ninja accepts a zero invoice cost and a negative expense. The ODAY dashboard rejects both before the request. | Not changed. A global minimum would alter Invoice Ninja credit and adjustment workflows. | `test_invoice_and_expense_decimal_amounts_persist` still allows the stored zero and the exact `-5.00` expense. |
| ODAY-P3-006 | P2 | Open | `oday_cheques.company_id`, `oday_employees.company_id`, and `oday_payroll_payments.company_id` are indexed and have no foreign key to `companies`. | No migration. Production data was not inspected, and the disposable database had contained orphan lock-test cheques. | Schema inspection on MySQL 8.0.46. The five `LOCK-1` rows were deleted from the disposable database only. |
| ODAY-P3-007 | P2 | VERIFIED — CLOSED | Two overlapping HTTP workers had not been run. | `ConcurrentChequeClearTest` starts two PHP HTTP kernels against the same isolated cheque. | One payment for `CONCURRENT-CLEAR`. The cheque ended `cleared`. Both responses were 200 or 422. |

## Phase 4 — frontend

| ID | Severity | Status | Root cause | Correction | Verification |
|---|---|---|---|---|---|
| ODAY-P4-001 | P1 | VERIFIED — CLOSED | Cheque and document pages were implemented and linked from the dashboard, but neither id was in `NAV_GROUPS`, so the sidebar could not open them. | Added `documents` and `checks` to the existing billing group. Permissions still filter the items. | `navigationRoutes.test.js`. |
| ODAY-P4-002 | P1 | VERIFIED — CLOSED | Only cheque paths were written to the URL. Refresh of any other existing page returned to the dashboard. | Existing page ids now map to paths through the current history helper. Cheque detail paths are unchanged. Project detail stays in memory. | `pageIdFromPath` / `pathForPage` assertions. |
| ODAY-P4-003 | P1 | VERIFIED — CLOSED | Every authenticated 401 and 403 cleared the session. A permission refusal, including cheque authorization 401 and backup 403, logged the user out. | End the session for invalid-token 403 and for 401 that is not an authorization denial. | Dashboard `client.auth.test.js` (5) and mobile `client.auth.test.ts` (2). |
| ODAY-P4-004 | P2 | VERIFIED — CLOSED | Dashboard fallback text for HTTP 503 and 500 named port 3306, `.env`, and port 8000 when the server sent no message. | Generic Arabic text. Status codes unchanged. | Source review. No live database-down request. |
| ODAY-P3-008 | P3 | VERIFIED — CLOSED | The test expected HTTP 422 while the process `.env` had Google client credentials, so connect returned 200. | The test now sets `oday.google_drive_backup.client_id` and `client_secret` to empty before the request. Production connect behavior is unchanged. No Google request is made on that path. | `BackupAuthorizationApiTest` passed inside the 39-test MySQL run. |

Login now clears the React Query cache before storing the new session. There is no mounted login-component test for that line.

## Phase 5 — security and production configuration

| ID | Severity | Status | Root cause | Correction | Verification |
|---|---|---|---|---|---|
| ODAY-P5-001 | P0 | VERIFIED — CLOSED | `BackupArchiveBuilder` wrote a full `mysqldump` and the global dashboard JSON into a company download. Encryption used one server key, so a company administrator could decrypt every company's rows. | New archives contain `database.json` for tables that have `company_id`, limited to 5,000 rows of `oday_cheques` and `company_settings`, plus a manifest with `scope=company`. No `database.sql`. No `oday-dashboard.json`. | `BackupArchiveScopeTest`: own cheque present, foreign cheque and office name absent. |
| ODAY-P5-002 | P0 | VERIFIED — CLOSED | Existing `backup_runs` rows have a null `archive_scope` and may still point at a full dump. | `GET /api/backup/runs/{id}/download` returns HTTP 409 `backup_download_blocked` unless `archive_scope` is `company`. Files are not deleted. | Same test, unscoped run. |
| ODAY-P5-003 | P1 | VERIFIED — CLOSED | See `ODAY-P3-004`. | Scoped storage key. Client path remains `/api/oday/mobile/office-settings`. | `OfficeSettingsIsolationTest`. |
| ODAY-P5-004 | P1 | VERIFIED — CLOSED | See `ODAY-P1-007`. | Legacy items route returns 410. | `OdayDashboardSyncAuthTest`. |
| ODAY-P5-005 | P1 | IMPLEMENTED — VERIFICATION PENDING | API traffic did not consult `REQUIRE_HTTPS`. | `RequireHttps` sits after `TrustProxies`. JSON and `api/*` over insecure HTTP return 426 when the flag is true. `phpunit.xml` forces the flag false. `.env.example` is `true`. The live reverse proxy was not exercised. | `RequireHttpsTest`: open when false, 426 when true, 200 when `X-Forwarded-Proto` is https from a trusted proxy. |
| ODAY-P5-006 | P1 | BLOCKED | `PDF_GENERATOR=hosted_ninja` sends invoice documents to hosted processing. | No generator switch. No PDF was produced in this environment. | Not executed. |
| ODAY-P5-007 | P1 | BLOCKED | No tested recovery path exists while restore is disabled. | Restore was not re-enabled and was not replaced. | `BackupRestoreBlockedTest`, 5 tests. |

`ODAY-C-010` stays open: CORS remains `*`. `ODAY-C-011` was closed in Phase 6. `ODAY-P3-005` and `ODAY-P3-006` stay open. `ODAY-P3-007` was closed in Phase 7B. `ODAY-P1-008` stays open because no production host exists. Global dashboard keys other than office settings were not given a new store.

The disposable migration `2026_11_18_000000_add_archive_scope_to_backup_runs` was applied only to `oday_financial_verification` on `127.0.0.1:3307`. The production database was not migrated.

## Phase 6 — desktop and mobile

| ID | Severity | Status | Root cause | Correction | Verification |
|---|---|---|---|---|---|
| ODAY-C-011 | P2 | VERIFIED — CLOSED | `encrypt()` wrote `plain:` plus base64 when `safeStorage` was unavailable, and `decrypt()` returned that value. | `planStorage` refuses credential writes without encryption. `readStoredValue` purges `plain:` and does not return it. Renderer memory holds the session until logout. | `vaultCodec.test.ts`, `session.desktop.test.js`. |
| ODAY-P6-001 | P2 | VERIFIED — CLOSED | `oday:print:pdf` joined `os.tmpdir()` with the caller-supplied name, so a name containing `..` could leave the temp directory. | `safePdfFileName` keeps the base name and allows only a conservative character set. The resolved path must stay inside the temp directory. | `printName.test.ts`. |
| ODAY-P6-002 | P1 | Open | See `ODAY-P1-008`. Fail-closed URL policy is in place. | No production origin was invented. | Policy tests and `expo config`. |
| ODAY-P6-003 | P2 | NOT VERIFIED | The NSIS installer was generated and not run. | Not installed, so an existing user installation was not replaced. | Artifact path only. |
| ODAY-C-014 | P2 | BLOCKED | No signing certificate. | electron-builder skipped signtool. | Build log: `no signing info identified`. |

Restore was not re-enabled in Phase 6. Phase 7A updated `ODAY-P1-006` and `ODAY-P1-009` without closing them.

## Phase 7A — release blockers

| ID | Severity | Status | Root cause | Correction | Verification |
|---|---|---|---|---|---|
| ODAY-P1-009 | P1 | Partial | Company archives are not a full backup, and the application restore stays disabled. | Operator procedure: `mysqldump` plus a file copy, outside `POST /api/backup/restore`. | Disposable drill: 90 tables, 329 migrations, matching cheque checksum and amount sum. Invalid SQL rejected. Production not restored. |
| ODAY-P1-006 | P1 | Partial | Hosted PDF sends invoice HTML off-server. | Snappdf can generate locally. The example value was not switched. | Synthetic PDF, Arabic and `10.10` visible. Full invoice template not generated. |
| ODAY-P7A-001 | P2 | Open | `Snappdf::executeOnWindows` joins the Chromium path without quotes, so `Program Files` fails. | No vendor edit. Production path must contain no spaces. | Direct Chrome path failed. A space-free launcher succeeded. |
| ODAY-P7A-002 | P2 | NOT VERIFIED | Installer execution could replace a machine that already has an `ODAY OS` uninstall entry. | Installer was not run. | `dashboard/release-phase6/ODAY-OS-Setup.exe` exists from Phase 6. |
| ODAY-C-014 | P2 | BLOCKED | No signing certificate. | None invented. | Signing remains skipped. |
| ODAY-P1-008 | P1 | Open | No real production API origin. | None invented. | Fail-closed policy from Phase 6 remains. No EAS build. |
| ODAY-P7A-003 | P1 | Partial | Packaged Electron login, workflows, and a 403 permission denial that kept the session are verified. Live HTTPS remains REL-C1. | No product change. | `REL_B2_AUTHENTICATED_ELECTRON_RUNTIME_REPORT.md`. `RequireHttpsTest` still covers the proxy unit only. |

## Phase 7B — end-to-end verification

HTTP workflows were re-executed on `oday_financial_verification`. Browser, authenticated Electron, installer, device, and Invoice Ninja invoice PDF were not executed in Phase 7B. `ODAY-P3-007` is closed by `ConcurrentChequeClearTest`. REL-B2 later closed the packaged Electron session, including a 403 that left the session in place. `ODAY-P7A-003` stays Partial only because live HTTPS remains REL-C1. `ODAY-P1-006`, `ODAY-P1-008`, `ODAY-P1-009`, `ODAY-P7A-001`, `ODAY-P7A-002`, and `ODAY-C-014` stay open or blocked.

No product code changed in Phase 7B. The new files are the concurrent worker and its test. Restore stayed disabled.

## Explicitly out of Phase 7B

No screen, report, or restore path was added.

## Phase 7C — release assessment

Read-only. No product code changed and no test was re-run. No issue was closed.

`ODAY-P5-006` and `ODAY-P5-007` keep their earlier wording. REL-D1 later proved isolated recovery, and REL-B1 later rendered the invoice template locally. Production recovery, the production Chromium path, and live HTTPS remain open.

Desktop 1.0 and Mobile 1.0 are both `NO-GO`. Signing (`ODAY-C-014`) is a distribution decision, not a substitute for recovery, HTTPS, or the invoice PDF.

## REL-D1 — isolated recovery

`ODAY-P1-009` is not closed for production. The isolated drill restored a real invoice and a local-disk attachment, and the application on the second database read both. `POST /api/backup/restore` still returns 409. No product feature was added.

## REL-B1 — local invoice PDF

The Invoice Ninja template was rendered with `snappdf` on `oday_relb1` at `127.0.0.1:3307`. That database was dropped after the check. A Chromium path containing spaces still fails. A space-free path to the installed Chrome succeeded. `PDF_GENERATOR=hosted_ninja` remains in `.env.example`. The user's `.env` was not edited. HTTPS and the installer were not exercised. `ODAY-P1-006` stays Partial because of HTTPS and the production server.

## REL-B2 — authenticated packaged Electron

`ODAY OS.exe` from `dashboard/release-phase6/win-unpacked` logged in as `relb2.office@example.test` against `oday_relb2` on `127.0.0.1:3307` and `127.0.0.1:8017`. Dashboard, clients, project list, invoices, the existing receipt, cheque create and deposit, a decimal expense, payroll, office-summary plus CSV, the empty documents page, and the backup page were exercised in the packaged UI. Invoice PDF preview wrote `%TEMP%\0001.pdf` and the print dialog was cancelled. Secure session restore, logout, restart-to-login, invalid and empty credentials, backend-down, and token revocation were observed. A non-admin session clicked the existing backup action, received 403, and stayed signed in. No product code changed. The installer was not run. Desktop 1.0 stays `NO-GO`. The isolated database was dropped after the counts were recorded.
