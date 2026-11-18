# المرحلة 7A — معالجة حواجز الإصدار

الحالة: **مكتملة مع قيود موثّقة**. النظام ليس جاهزاً للإنتاج، ولا يوجد إذن إصدار.

`ZERO NEW PRODUCT FEATURES`

## 1. الملخص التنفيذي

أُثبت إجراء استعادة للمشغّل على قاعدة معزولة باستخدام `mysqldump`، منفصلاً عن مسار التطبيق المعطل. أُنتج PDF محلي تجريبي بـ Snappdf وChrome، وظهرت فيه العربية والمبلغ `10.10`، من غير الاتصال بـ `invoicing.co`. قالب فاتورة Invoice Ninja نفسه لم يُولَّد.

HTTPS المحلي يرفض الترويسة المزوّرة من وكيل غير موثوق. لا وكيل إنتاج حي. المثبّت لم يُشغَّل ولا توقيع له. الجوال بلا عنوان إنتاج ولم يُبنَ عبر EAS.

## 2. الحالة الأولية

- الفرع `main`، الالتزام `0b7f7ae`. شجرة العمل متسخة. لا commit ولا push.
- الحاوية `oday-financial-verification`، MySQL 8.0.46، `127.0.0.1:3307`. لم تُستخدم قاعدة `ninja` على 3306.
- أرشيف الشركة ما زال `database.json` و`manifest.json` بـ `scope=company`، والجدولان المرشحان `oday_cheques` و`company_settings` بحد 5000 صف.

## 3. الاستعادة

النسخة التي ينزّلها مستخدم الشركة ليست نسخة نظام: لا مرفقات، ولا بقية جداول Invoice Ninja، والحد 5000 صف يمكن أن يقطع البيانات.

إجراء المشغّل منفصل عن `POST /api/backup/restore` ولا يمر برمز شركة. التمرين:

- تفريغ `--single-transaction` ثم استيراد إلى `oday_recovery_drill`.
- 90 جدولاً و329 تهجيرًا في الطرفين.
- بصمة `oday_cheques` واحدة، والمجموع `30.300000`.
- SQL التالف رُفض بـ 1064.
- ملف اصطناعي تطابقت بصمة SHA256 ثم كُشف حذفه.
- حُذفت الوجهة بعد التسجيل.

هذا ليس تحقق إنتاج. القاعدة المعزولة لا تحتوي دفتر مكتب (عدد الشركات 0). الاستعادة بين القاعدة والملفات ليست ذرية. التفاصيل في `DISASTER_RECOVERY_RUNBOOK.md`.

## 4. PDF

المولّدات المدعومة في `PdfService::resolvePdfEngine`: `phantom` و`hosted_ninja` و`gotenberg`، وغير ذلك Snappdf عبر `PdfMaker`.

المثال ما زال `PDF_GENERATOR=hosted_ninja` حتى لا ينكسر تطوير بلا Chromium. التعليق يفرض `snappdf` للإنتاج.

تشغيل Snappdf مع Chrome في `Program Files` فشل لأن `executeOnWindows` لا يقتبس المسار (`ODAY-P7A-001`). مُشغّل بلا مسافات أنتج ملفاً `%PDF-1.4` بحجم 28997 بايت. العرض أظهر «فاتورة تجريبية» و«المبلغ ILS 10.10». الملف لا يحتوي `invoicing.co`. لم يُستدعَ القالب الحقيقي للفاتورة ولم يُبدَّل `.env`.

## 5. البنية

- `RequireHttps` بعد `TrustProxies`. اختبار جديد: `X-Forwarded-Proto: https` من عنوان غير موثوق يبقى غير آمن ويرد 426.
- `schedule:list` على القاعدة المعزولة أظهر `oday:backup-run-scheduled` كل 15 دقيقة. لم يُشغَّل الأمر ولم يُنشر cron.
- `queue:work` لا يُجدول إلا إذا كان الطابور `database` مع الاستضافة الذاتية والطابور الداخلي ومن غير Docker. المثال `QUEUE_CONNECTION=sync`.
- لم يُنشأ نطاق إنتاج ولم تُدوَّر أسرار.

## 6. سطح المكتب والجوال

المثبّت `dashboard/release-phase6/ODAY-OS-Setup.exe` موجود من المرحلة 6 وغير موقّع. لم يُشغَّل لأن الجهاز ليس بيئة معزولة ويوجد سجل إلغاء تثبيت باسم ODAY OS. `INSTALLER RUNTIME — NOT VERIFIED`.

`eas.json` بلا `EXPO_PUBLIC_API_URL`. لم يُخترع عنوان. لم يُنفَّذ `eas build`. يلزم لاحقاً عنوان HTTPS وحساب EAS ومفتاح توقيع Android. السياسة التي تمنع localhost في الإنتاج بقيت.

## 7. الاختبارات

```text
php vendor/phpunit/phpunit/phpunit tests/Unit/Oday/RequireHttpsTest.php tests/Unit/Oday/BackupRestoreBlockedTest.php tests/Feature/Oday/FinancialMysqlVerificationTest.php tests/Feature/Oday/OfficeSettingsIsolationTest.php tests/Feature/Oday/OdayDashboardSyncAuthTest.php tests/Feature/Oday/Phase3IsolationTest.php tests/Feature/Oday/BackupArchiveScopeTest.php
```

البيئة: PHP 8.4.24، MySQL المعزولة على 3307. النتيجة: 24 اختباراً، 155 تأكيداً، OK. لا فشل ولا تخطٍّ.

لم يُعد تشغيل Vitest لأن واجهة React وExpo لم تتغير. لم يُنفَّذ بناء EAS ولا تثبيت Windows ولا قالب الفاتورة الكامل.

## 8. الملفات

- `tests/Unit/Oday/RequireHttpsTest.php` — رفض HTTPS المزوّر من وكيل غير موثوق.
- `.env.example` — تعليق إنتاج Snappdf ومسار Windows بلا مسافات. القيمة بقيت `hosted_ninja`.
- وثائق المرحلة فقط غير ذلك.

لم يُمس حساب المال ولا مسار الاستعادة ولا تصميم الواجهة.

## 9. القبول

| المعيار | الحالة |
|---|---|
| جرد بيانات الاستعادة وتوثيق أرشيف الشركة | VERIFIED |
| تمرين استعادة معزول | VERIFIED على القاعدة المعزولة فقط |
| استعادة إنتاج | NOT VERIFIED |
| مسار التطبيق المعطل | VERIFIED |
| PDF محلي تجريبي | VERIFIED |
| قالب الفاتورة وسريته في الإنتاج | NOT VERIFIED |
| HTTPS المحلي ورفض وكيل غير موثوق | VERIFIED |
| وكيل إنتاج حي | NOT VERIFIED |
| المجدول | موثّق، والـ cron غير منشور |
| المثبّت والتوقيع | NOT VERIFIED / BLOCKED |
| بناء الجوال | BLOCKED |
| الانحدار المالي والعزل | VERIFIED |
| لا مزايا ولا تغيير بصري | VERIFIED |

## 10. المرحلة 7B

غير جاهزة كإذن إصدار. يمكن لاحقاً فحص ما بقي خارج الكود: استعادة إنتاج مصرح بها، قالب الفاتورة على `snappdf`، وكيل حي، تثبيت على جهاز يمكن مسحه، شهادة توقيع، وعنوان HTTPS حقيقي ثم بناء EAS.

لم تُبدأ المرحلة 7B.
