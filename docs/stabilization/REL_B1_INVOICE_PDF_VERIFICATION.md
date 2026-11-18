# REL-B1 — تحقق PDF الفاتورة

## 1. الملخص

الحالة: **`VERIFIED — ISOLATED INVOICE PDF COMPLETE / PRODUCTION RUNTIME PENDING`**

قالب فاتورة Invoice Ninja وُلّد محلياً بـ Snappdf من مسار التنزيل القائم. العربية والمبلغ ظاهران. لم يُرسل HTML الفاتورة إلى مولّد Invoice Ninja المستضاف. خادم الإنتاج لم يُضبط، والمثال ما زال `hosted_ninja`.

## 2. المسار الحالي

`POST /api/v1/invoices/bulk` مع `action=download` يستدعي `getInvoicePdf()` ثم `CreateRawPdf` ثم `PdfService::resolvePdfEngine()`.

الاختيار:

- `phantom` يشغّل Phantom.
- `hosted_ninja` أو `NINJA_HOSTED_PDF` يرسل HTML إلى `https://pdf.invoicing.co/api/` عبر `NinjaPdf`.
- `gotenberg` يستخدم Gotenberg.
- غير ذلك يستخدم `PdfMaker` وSnappdf.

الواجهة في `dashboard/src/lib/api/invoices.js` تستدعي هذا المسار نفسه. Electron يأخذ الناتج عبر `openOrSaveBlob` ثم `print.pdf`. لم يُضف مسار جديد.

## 3. الإصدارات

PHP 8.4.24. إصدار التطبيق الافتراضي في الإعداد `5.13.38`. Snappdf `dev-master` عند `73997afb327fb9cd99686368769d2f0562cb3a9f`. Chrome المثبت موجود تحت `Program Files`. لم تُنسخ ثنائيته.

## 4. Chromium

المسار ذو المسافات: `C:\Program Files\Google\Chrome\Application\chrome.exe`.

المسار المستخدم في التمرين: وصلة دليل بلا مسافات تشير إلى مجلد Chrome نفسه، ثم `chrome.exe` داخلها. لا مسار ثابت داخل الكود.

## 5. سبب فشل المسافات

`Snappdf::executeOnWindows` يدمج الأوامر بمسافات ويمررها إلى `exec`. أُعيد الإنتاج على HTML قصير:

`path_ok=no` والرسالة `'C:\Program' is not recognized`.

الوصلة بلا مسافات: `path_ok=yes` و14928 بايت وبداية `%PDF`. المكتبة لم تُعدَّل. العيب ما زال فيها.

## 6. التصحيح

لا تعديل منتج. الاختبار يضبط وقت التشغيل:

`ninja.pdf_generator=snappdf`

`ninja.invoiceninja_hosted_pdf_generation=false`

`ninja.snappdf_chromium_path` من البيئة، بشرط ألا يحتوي مسافة وأن يكون الملف موجوداً.

`.env.example` يوضح أن الإنتاج يضبط `snappdf` ومساراً بلا مسافات، ويبقي قيمة المثال `hosted_ninja` حتى لا تفشل نسخة تطوير بلا Chrome. ملف `.env` الفعلي لم يُمس.

## 7. فاتورة الاختبار

القاعدة `oday_relb1` على `127.0.0.1:3307`. قبل البيانات: 0 شركات. عملة ILS من الجدول، والمعرف 6. عميل `عميل تجريبي`، مكتب `مكتب تجريبي`، بند `خدمات هندسية` بتكلفة `1234.56`، وملاحظة `فاتورة تجريبية`. الإنشاء عبر `POST /api/v1/invoices?mark_sent=true`. المبلغ المخزن طابق `1234.56`. حُذفت القاعدة وملفات الشركات المؤقتة بعد التسجيل. قاعدة `ninja` لم تُستخدم.

## 8. الملف

التنزيل أعاد 200 و`Content-Type` فيه `application/pdf`. الرأس `%PDF-1.4`. فيه `startxref` و`%%EOF`. صفحة واحدة. الحجم كان أكبر من حد PDF الفارغ في Invoice Ninja (12 كيلوبايت). PyMuPDF قرأ النص والمبلغ. لا قالب بديل.

## 9. العربية

عُرضت الصفحة كصورة. ظاهر من غير مربعات خطوط ناقصة ومن غير تداخل:

- `مكتب تجريبي`
- `عميل تجريبي`
- `خدمات هندسية` في البند والوصف
- `فاتورة تجريبية`

الأرقام والتسميات الإنجليزية للقالب بقيت في أماكنها. التخطيط هو تخطيط الفاتورة القائم، لا تصميم جديد.

## 10. المبلغ

`Invoice Total` و`Line Total` و`Total` و`Balance Due` كلها `NIS 1,234.56`. `Paid to Date` هو `NIS 0.00` لأن الفاتورة أُرسلت ولم تُسجل عليها دفعة. هذا يطابق الرصيد الكامل. الرمز `NIS` هو رمز ILS في جدول العملات.

## 11. السرية

أثناء التوليد ضُبط `HTTP_PROXY` و`HTTPS_PROXY` و`ALL_PROXY` على `http://127.0.0.1:9` مع استثناء `localhost`. Guzzle، وهو ما يستخدمه `NinjaPdf` لإرسال HTML، يفشل على هذا الوكيل. الملف ظهر رغم ذلك، و`pdf.invoicing.co` غير موجود داخله. إذن مسار المستضاف لم يُستخدم.

قالب Invoice Ninja قد يطلب خط Google عبر `resolveFont`. لم يُلتقط مرور Chrome نفسه. ظهور الحروف العربية لا يعني أن محتوى الفاتورة أُرسل إلى خدمة PDF خارجية. إن مُنع الخط البعيد، تبقى الحروف على خطوط النظام إن وُجدت.

موقع الشركة في بيانات الاختبار كان يشير إلى عنوان استضافة داخل الـ fixture. استُبدل في التمرين بـ `http://127.0.0.1` حتى لا يُقرأ كنقل للفاتورة.

Snappdf يكتب HTML مؤقتاً في مجلد النظام المؤقت ثم يحذفه بعد التوليد. الاستجابة تُبث للمستخدم المصرح، لا إلى مجلد عام.

## 12. التفويض

صاحب الشركة نزّل الملف. طلب بلا رمز رُفض بـ 401 أو 403. معرّف غير موجود لم يُرجع PDF.

مسار Chrome المفقود لم يُرجع PDF ولم يسقط إلى المستضاف. الرسالة: `Unable to generate the raw PDF => The system cannot find the path specified.` لا كلمة سر ولا `pdf.invoicing.co` ولا مسار التنفيذ الكامل.

## 13. العزل

رمز شركة أخرى على المسار نفسه لم يُرجع `%PDF` ولا المبلغ `1234.56`. هذا سلوك النطاق الحالي `company()`، ولم تُضف قاعدة صلاحية.

## 14. React

`downloadInvoicePdf` يرسل `POST /api/v1/invoices/bulk` مع `action=download` و`Accept: application/pdf`. هذا هو المسار الذي نُفّذ. لم تُفتح شاشة الفواتير في المتصفح. لا يُحتسب ذلك تشغيلاً للواجهة.

## 15. Electron

`openOrSaveBlob` عند سطح المكتب يمرر الـ blob إلى `print.pdf` أو `print.open`. لم يُشغَّل Electron ولم يُطبع الملف منه. العقد لم يتغير. التشغيل غير مُتحقق.

## 16. الفشل

| الحالة | النتيجة |
|---|---|
| مسار فيه مسافات | فشل بأمر `C:\Program` |
| مسار بلا مسافات | PDF صالح |
| ملف Chrome غير موجود | خطأ مفهوم بلا PDF وبلا سقوط إلى المستضاف |
| بلا مصادقة | 401 أو 403 |
| شركة أخرى | لا PDF |
| فاتورة غير موجودة | لا PDF |

## 17. الاختبارات

الأمر الأخير للتمرين، على `oday_relb1` والمنفذ 3307، مع `ODAY_RELB1=1` و`SNAPPDF_CHROMIUM_PATH` بلا مسافات:

`php vendor/phpunit/phpunit/phpunit tests/Feature/Oday/RelB1InvoicePdfTest.php --filter test_existing_invoice_pipeline_renders_a_local_pdf`

النتيجة النهائية: اختبار واحد، 30 تأكيداً، ناجح، بلا فشل وبلا تخطٍ.

قبلها فشلت جولات لأن الاختبار فحص حالة الاستجابة المتدفقة خطأً ثم ترك مخزناً مؤقتاً مفتوحاً. أُصلح الاختبار لا المنتج، ثم نجحت الجولة الأخيرة.

`BackupRestoreBlockedTest` على `oday_financial_verification`: 5 اختبارات، 25 تأكيداً، ناجحة.

## 18. ما لم يُنفَّذ

متصفح شاشة الفواتير، وElectron، وChrome على خادم الإنتاج. لا تُعلَّم ناجحة.

الاختبار الجديد لا يعمل داخل المجموعة العادية إلا إذا ضُبط `ODAY_RELB1=1` وكانت القاعدة `oday_relb1`.

## 19. الملفات

- `tests/Feature/Oday/RelB1InvoicePdfTest.php` اختبار اختياري.
- `.env.example` تعليق فقط. القيمة تبقى `hosted_ninja`.
- وثائق التثبيت.

لا تغيير في القالب ولا في الحسابات ولا في vendor ولا في `.env`.

## 20. الإنتاج

على الخادم المقصود: `PDF_GENERATOR=snappdf` ومسار Chrome بلا مسافات، مع خطوط عربية على النظام أو سماح بخط Google إن قُبل كأصل وليس كمولّد. حتى يُجرَّب ذلك الخادم تبقى جاهزية الإنتاج معلّقة. HTTPS ليس مغلقاً.

## 21. الحالة

`VERIFIED — ISOLATED INVOICE PDF COMPLETE / PRODUCTION RUNTIME PENDING`

ليس `VERIFIED — CLOSED` لـ `ODAY-P1-006`. سطح المكتب يبقى `NO-GO`.

## 22. REL-B2

يمكن أن يبدأ. لم يُبدأ هنا. الاستعادة داخل التطبيق بقيت معطلة.
