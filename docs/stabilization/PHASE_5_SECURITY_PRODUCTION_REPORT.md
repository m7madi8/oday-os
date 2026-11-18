# المرحلة 5 — تقوية الأمان وإعدادات الإنتاج

الحالة: **مكتملة مع قيود موثّقة**.

إكمال هذه المرحلة لا يمنح إذن إصدار إنتاج. لم يُنشر النظام، ولم يُنشأ commit، ولم تُدفع التغييرات، ولم تُمس قاعدة `ninja` على المنفذ 3306، ولم تُعاد تفعيل الاستعادة.

## 1. الملخص التنفيذي

أُغلقت ثغرتان مؤكدتان في سرية النسخ: الأرشيف الجديد لا يحتوي `mysqldump` لقاعدة البيانات كاملة، وتنزيل أي تشغيل بلا `archive_scope=company` يُرفض بـ HTTP 409 `backup_download_blocked`.

إعدادات المكتب لم تعد تُقرأ من المفتاح العام `office-settings` عندما يوجد أكثر من شركة. مسار المزامنة القديم `/api/oday/items` يعيد HTTP 410 حتى مع الرمز الثابت الصحيح. فرض HTTPS أصبح مربوطًا بـ `REQUIRE_HTTPS`، واختبار Google OAuth لم يعد يعتمد على قيم `.env` المحيطة.

ما زال محجوبًا: استعادة البيانات، وخصوصية PDF لأن المولّد في المثال ما زال `hosted_ninja` ولم يُنتج PDF محلي، وعنوان API الإنتاجي للجوال. CORS ما زال `*`، وتخزين Electron يعود إلى base64 عندما لا يتوفر `safeStorage`.

`ZERO NEW PRODUCT FEATURES`

## 2. الحالة الأولية

- الفرع: `main`
- الالتزام: `0b7f7ae`
- شجرة العمل: متسخة (99 مسارًا في `git status --short`). لم يُستخدم reset أو stash أو commit أو push.
- مراحل 0–4 موثّقة في `docs/stabilization/`. لم تُعاد كتابة نتائجها.
- بيئة الاختبار: الحاوية `oday-financial-verification`، MySQL `8.0.46`، `127.0.0.1:3307`، القاعدة `oday_financial_verification`، المستخدم `oday_verify`. `SHOW DATABASES` أعاد `information_schema` و`oday_financial_verification` و`performance_schema` فقط.
- عمود `archive_scope` طُبّق بأمر migrate على هذه القاعدة فقط.
- `phpunit.xml` يفرض `REQUIRE_HTTPS=false` حتى لا تعيد اختبارات API الرمز 426.

## 3. سلامة النسخ الاحتياطية

`BackupArchiveBuilder` كان يكتب `database.sql` عبر `mysqldump` عندما يكون الاتصال الافتراضي `mysql`، ويكتب `oday-dashboard.json` من `OdayDashboardStore::all()`. التشفير AES-256-GCM بمفتاح خادم واحد (`sha256` لقيمة `oday.backup.encryption_key`). التنزيل يبث الملف المشفّر `.zip.enc` دون فك التشفير. المفتاح لا يُعاد في استجابة التشغيل. من يملك المفتاح وملف شركة واحدة كان يستطيع قراءة بقية الشركات.

الأرشيف الجديد:

- `database.json` لجدول يملك عمود `company_id` فقط، والجدولان المرشحان `oday_cheques` و`company_settings`، بحد 5000 صف.
- `manifest.json` بقيم `scope=company` و`database=company_subset`.
- لا `database.sql` ولا `oday-dashboard.json`.
- `BackupEngine` يضبط `archive_scope=company` على التشغيل الجديد.

جدول `company_settings` غير موجود في قاعدة التحقق، لذلك تُخطى. هذا الأرشيف ليس مجموعة استعادة كاملة.

تنزيل تشغيل `archive_scope` ليس `company` يعيد:

`HTTP 409` مع `backup_download_blocked`

الملفات القديمة لم تُحذف. `BackupRestoreService::restoreFromRun` ما زال يرمي `BackupRestoreUnavailable`. الاستعادة المؤكدة تبقى HTTP 409 `restore_disabled`.

Google Drive يرفع الملف المشفّر نفسه. العزل الجديد يسري على الأرشيفات الجديدة فقط.

## 4. المصادقة والصلاحيات

- رمز API غير الصالح يبقى HTTP 403 `Invalid token` عبر `token_auth`.
- رفض الصلاحية الصريح لا يُنهي جلسة الواجهة: قاعدة المرحلة 4 في `shouldEndSession` لم تُمس. اختبارات Dashboard (5) والجوال (2) ما زالت ناجحة.
- HTTP 401 الذي يحمل `This action is unauthorized` لا يمسح الجلسة.
- عمليات النسخ والموظفين والتقارير ما زالت خلف `token_auth`. اختبار المرحلة 3 أكد 403 عند غياب الرمز، و404 عند الوصول إلى موظف أو مستند شركة أخرى.
- مسار العناصر القديم لم يعد يمنح وصولًا بالرمز الثابت.

## 5. عزل الشركات

- إعدادات المكتب: المفتاح المخزّن `office-settings:{companyId}`. مسار العميل يبقى `/api/oday/mobile/office-settings` والمفتاح الظاهر للعميل يبقى `office-settings`.
- القيمة القديمة بلا مالك تُنسخ إلى مفتاح الشركة فقط إذا كان `Company::query()->count() === 1`. خلاف ذلك تبقى على القرص ولا تُعاد.
- `OdayDashboardController` يخفي `office-settings` وأي `office-settings:` لا يطابق شركة الطلب. التعبير النظامي للمفتاح يرفض النقطتين، فلا يُكتب المفتاح المعزول عبر items API.
- اختبار شركتين: القراءة الأولى أعادت `settings` فارغة رغم وجود `LEGACY-SHARED`، ثم حفظت الشركة الحالية اسمها وقرأته، وفهرس items لم يتضمن المفتاح القديم ولا النص المشترك.
- مفاتيح أخرى في الملف نفسه، مثل `dashboard-settings` و`quick-notes`، ما زالت عامة. لم يُنشأ مخزن جديد لها.
- المستندات والشيكات: عزل المرحلة 3 والاختبارات المالية بقيا على قاعدة التحقق.

## 6. إعدادات الإنتاج

- HTTPS: `RequireHttps` بعد `TrustProxies`. العلم false يمرر الطلب. العلم true على HTTP غير الآمن يعيد 426 للنص JSON و`api/*`، ويعيد توجيه بقية الطلبات إلى HTTPS. `X-Forwarded-Proto` لا يُحسب إلا إذا كان عنوان الوكيل في `TRUSTED_PROXIES`. لا تُستخدم القيمة `*`. `.env.example` أصبح `REQUIRE_HTTPS=true` مع تعليق للتطوير المحلي. ملف `.env` الفعلي لم يُعدَّل. لم يُختبر وكيل عكسي حي.
- PDF: المثال ما زال `PDF_GENERATOR=hosted_ninja`. التعليق يوضح أن هذا الخيار يرسل الفاتورة خارج الخادم وأن `snappdf` يحتاج مسار Chromium وPDF محليًا ناجحًا. لم يُولَّد PDF. الخصوصية **BLOCKED**.
- CORS: `config/cors.php` ما زال `allowed_origins` = `*`. لم يُقفل على أصل متخيل. `ODAY-C-010` مفتوح. CORS ليس بديلًا للمصادقة.
- الأسرار: لم تُطبع قيم. لم تُدوَّر أسرار إنتاج. مفاتيح المثال فارغة حيث يلزم (`BACKUP_ENCRYPTION_KEY`, `ODAY_DASHBOARD_TOKEN`).
- السجلات: رسائل فشل قاعدة البيانات من المرحلة 3 بقيت عربية وقصيرة. لم يُضف تسجيل للمفاتيح.
- المجدول: `php artisan schedule:run` مطلوب كل دقيقة. النسخ المجدول `oday:backup-run-scheduled` كل 15 دقيقة. `queue:work database --stop-when-empty` كل دقيقة عندما تُستخدم طوابير قاعدة البيانات. `.env.example` يبقي `QUEUE_CONNECTION=sync`. لم يُنشر cron.

## 7. حماية Electron

`dashboard/electron/main.ts` و`print.ts`:

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`

`ipc/store.ts` يحصر المفاتيح في `token`, `user`, `company`, `serverUrl`, `dashboardUrl`. `safeStorage` يكتب البادئة `enc:`. عند غياب التشفير يكتب `plain:` ثم base64. هذا المسار بقي لأن رفض التخزين يمنع تسجيل الدخول. `ODAY-C-011` مفتوح. لم يُشغَّل `electron-builder`.

## 8. حماية Mobile

- حُذف `EXPO_PUBLIC_API_URL=http://192.168.1.13:8000` من ملف `oday-mobile/eas.json` في وضع preview.
- وضع production ما زال بلا عنوان API. لم يُخترع نطاق.
- `getApiUrl` يعود إلى `http://127.0.0.1:8000` عند غياب العنوان. بناء إنتاج بلا أصل HTTPS ليس جاهزًا.
- الرمز على الجهاز في SecureStore. على الويب يبقى localStorage.
- `usesCleartextTraffic` و`NSAppTransportSecurity` بقيا للسماح بتطوير HTTP المحلي. `ODAY-P1-008` مفتوح. لم يُنشر التطبيق.

## 9. التكاملات الخارجية

اختبار `BackupAuthorizationApiTest` كان يفشل لأن `.env` المحلي يحتوي بيانات Google فيعيد `GET /api/backup/google/connect` الرمز 200. الاختبار الآن يفرغ `client_id` و`client_secret` قبل الطلب ويتوقع 422 ورسالة `Google Drive backup OAuth`. منطق الإنتاج لم يُغيّر. لم يُستدعَ Google.

لم تُضف تكاملات.

## 10. الثغرات والمخاطر

| المعرف | الشدة | الحالة | الأثر |
|---|---|---|---|
| ODAY-P5-001 | P0 | VERIFIED — CLOSED | أرشيف جديد كان يكشف كل الشركات لمن يفك تشفير ملف شركة واحدة. |
| ODAY-P5-002 | P0 | VERIFIED — CLOSED | تنزيل أرشيف قديم غير موسوم صار مرفوضًا. |
| ODAY-P5-003 / P3-004 | P1 | VERIFIED — CLOSED | إعدادات مكتب مشتركة لم تعد تُعاد لشركة ثانية. |
| ODAY-P5-004 / P1-007 | P1 | VERIFIED — CLOSED | الرمز الثابت لم يعد يفتح items API. |
| ODAY-P5-005 / P1-006 | P1 | HTTPS منفّذ، الوكيل الحي غير مُتحقَّق. PDF BLOCKED | فاتورة قد تغادر الخادم عبر `hosted_ninja`. |
| ODAY-P5-007 / P1-009 | P1 | BLOCKED | لا إجراء استعادة مُختبَر. |
| ODAY-P1-008 | P1 | Open | لا أصل إنتاج للجوال. |
| ODAY-C-010 | P2 | Open | CORS مفتوح. |
| ODAY-C-011 | P2 | Open | رمز Electron بصيغة plain عند غياب تشفير النظام. |
| ODAY-P3-005 / 006 / 007 | P2 | Open | صفر الفاتورة، غياب المفاتيح الأجنبية، وعمال HTTP المتزامنين. |

مخاطر لم تُثبت كثغرة جديدة: تكرار اسم المفتاح `office-settings` في العميل. التخزين هو المعزول.

## 11. الإصلاحات المنفذة

- `app/Services/Oday/Backup/BackupArchiveBuilder.php` — إيقاف التفريغ الكامل وملف اللوحة العام، وتخطي أي جدول بلا `company_id`.
- `app/Services/Oday/Backup/BackupEngine.php` — `archive_scope=company` للتشغيل الجديد.
- `app/Models/OdayBackupRun.php` — الحقل قابل للتعبئة.
- `database/migrations/2026_11_18_000000_add_archive_scope_to_backup_runs.php` — عمود نصي اختياري.
- `app/Http/Controllers/Oday/OdayBackupController.php` — رفض تنزيل غير الموسوم.
- `app/Http/Controllers/Oday/MobileOfficeSettingsController.php` — مفتاح الشركة، ونسخ الإرث لشركة واحدة فقط.
- `app/Http/Controllers/OdayDashboardController.php` — إخفاء مفاتيح المكتب عن items API.
- `routes/oday.php` — 410 لمسار items القديم فقط، دون التقاط `api/oday/mobile`.
- `app/Http/Middleware/RequireHttps.php` و`app/Http/Kernel.php` — الفرض بعد الوكلاء الموثوقين.
- `phpunit.xml` — `REQUIRE_HTTPS=false`.
- `.env.example` — `REQUIRE_HTTPS=true` وتعليق PDF. لم تُنسخ أسرار.
- `oday-mobile/eas.json` — حذف عنوان الشبكة المحلية.
- `tests/Unit/Oday/BackupAuthorizationApiTest.php` — تفريغ إعداد OAuth داخل الاختبار.
- `tests/Feature/Oday/BackupArchiveScopeTest.php`
- `tests/Feature/Oday/OfficeSettingsIsolationTest.php`
- `tests/Unit/Oday/RequireHttpsTest.php`
- `tests/Feature/Oday/OdayDashboardSyncAuthTest.php` — يتوقع 410.

`BackupRestoreService` و`TokenAuth` وحسابات المال لم تُعدَّل.

## 12. الاختبارات

البيئة: PHP 8.4.24، PHPUnit 11.5.56، `PHPRC` بحد ذاكرة 512M، `DB_*` و`DB_*3` على `127.0.0.1:3307` / `oday_financial_verification` / `oday_verify`.

أوامر نجحت بعد آخر تعديل سلوكي يخصها:

```text
php vendor/phpunit/phpunit/phpunit tests/Feature/Oday/OfficeSettingsIsolationTest.php tests/Unit/Oday/BackupRestoreBlockedTest.php tests/Feature/Oday/FinancialMysqlVerificationTest.php tests/Unit/Oday/BackupAuthorizationApiTest.php tests/Feature/Oday/Phase3IsolationTest.php tests/Feature/Oday/ChequeApiTest.php tests/Feature/Oday/PayrollApiTest.php
```

النتيجة: 39 اختبارًا، 227 تأكيدًا، OK.

```text
php vendor/phpunit/phpunit/phpunit tests/Unit/Oday/RequireHttpsTest.php tests/Feature/Oday/OdayDashboardSyncAuthTest.php tests/Feature/Oday/BackupArchiveScopeTest.php tests/Unit/Oday/OfficeReportFiguresTest.php
```

النتيجة: 9 اختبارات، 29 تأكيدًا، OK. ثم أُعيد `BackupArchiveScopeTest` بعد تخطي الجداول بلا `company_id`: 2/2 OK.

المجموع الفريد بعد الإصلاحات: 48 اختبار PHPUnit. لا فشل في التشغيل الأخير. لا تخطٍّ مُسجَّل في هذه الأوامر.

Dashboard من `dashboard/`:

```text
npm test -- --run
```

11 ملفًا، 124/124.

Mobile من `oday-mobile/`:

```text
npm test -- --run
```

3 ملفات، 8/8.

لم يُشغَّل: بناء Electron، بناء Expo، توليد PDF، طلب Google حقيقي، وكيل HTTPS حي، عاملان HTTP متزامنان لمسح الشيك.

فشل مؤقت أثناء التنفيذ ثم أُصلح: عمود `archive_scope` كان غائبًا قبل migrate على قاعدة التحقق؛ و`companies.is_deleted` غير موجود فاقتصر العد على `Company::query()->count()`.

## 13. توافق التطبيقات

- React: مسار الإعدادات واسم المفتاح كما هما. لم تُغيّر الواجهة.
- Electron: نافذة الإنتاج الأمنية كما كانت. التخزين الاحتياطي `plain:` بقي.
- Expo: حذف عنوان LAN من preview. بناء production بلا أصل ما زال غير صالح للإصدار.
- مستهلكو API: `api/oday/mobile/*` كما هو. `api/oday/items` فقط أصبح 410. إضافة Vite المحلية تكتب `dashboard/data/store.json` ولا تستدعي Laravel.

## 14. سلامة المراحل السابقة

- `FinancialMysqlVerificationTest` نجح ضمن الـ 39.
- `ChequeApiTest` 11 و`PayrollApiTest` 3 و`OfficeReportFiguresTest` 4 نجحت.
- عزل المستند والموظف من `Phase3IsolationTest` نجح.
- `BackupRestoreBlockedTest` 5 نجحت. الاستعادة معطلة.
- Vitest للوحة والجوال لم يتراجع.

## 15. المشاكل المتبقية

مؤكدة ومغلقة في هذه المرحلة: تسريب الأرشيف الجديد، تنزيل الأرشيف غير الموسوم، إعدادات المكتب بين شركتين، الرمز الثابت على items.

غير مُتحقَّق: HTTPS خلف وكيل الإنتاج الفعلي، بناء Electron المغلّف، بناء جوال للإصدار.

حاجبات إعداد: PDF المستضاف، عنوان API الإنتاجي للجوال، CORS المفتوح، رمز Electron غير المشفّر عند غياب نظام التشغيل.

حاجز استعادة: لا مسار استعادة مُختبَر. مطلوب لاحقًا إجراء تشغيلي يثبت استعادة شركة واحدة دون المساس بغيرها. لا يُنفَّذ داخل هذه المرحلة.

خارج النطاق: فاتورة بصفر، مصروف سالب، مشروع المصروف، مفاتيح أجنبية، مسح شيك بعاملين HTTP، مفاتيح اللوحة العامة غير إعدادات المكتب.

## 16. ضبط نطاق المشروع

`ZERO NEW PRODUCT FEATURES`

لم تُضف شاشة ولا دور ولا تقرير ولا مزود مصادقة ولا آلية استعادة.

## 17. معايير قبول المرحلة

| المعيار | الحالة | الدليل |
|---|---|---|
| سرية أرشيف جديد | VERIFIED | `BackupArchiveScopeTest` |
| منع تنزيل أرشيف غير موسوم | VERIFIED | HTTP 409 `backup_download_blocked` |
| الاستعادة معطلة | VERIFIED | `BackupRestoreBlockedTest` |
| عزل إعدادات المكتب | VERIFIED | `OfficeSettingsIsolationTest` |
| إغلاق الرمز الثابت | VERIFIED | HTTP 410 |
| صلاحيات الخادم | VERIFIED | `Phase3IsolationTest` و`BackupAuthorizationApiTest` |
| HTTPS عند تفعيل العلم | VERIFIED في الاختبار | `RequireHttpsTest` |
| HTTPS خلف وكيل إنتاج | NOT VERIFIED | لا وكيل حي |
| خصوصية PDF | BLOCKED | لا PDF محلي |
| اختبار OAuth حتمي | VERIFIED | تفريغ الإعداد داخل الاختبار، 422 |
| اختبارات المال | VERIFIED | 9 + شيكات + رواتب + تقرير |
| لا مزايا جديدة | VERIFIED | نطاق الملفات |

## 18. جاهزية المرحلة السادسة

يمكن بدء **Desktop & Mobile Stabilization** لفحص السلوك الحالي لـ Electron وExpo.

لا تُعد المرحلة السادسة إذن إصدار. تبقى خارجها: استعادة البيانات، وتبديل مولّد PDF، وعنوان إنتاج حقيقي، ونشر المتاجر، وبناء المثبّت.

لم تُبدأ المرحلة 6.
