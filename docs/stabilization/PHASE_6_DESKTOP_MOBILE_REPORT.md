# المرحلة 6 — تثبيت سطح المكتب والجوال

الحالة: **مكتملة مع قيود موثّقة**.

التطبيق المغلف فُتح حتى شاشة الدخول. المثبّت لم يُشغَّل. بناء إنتاج الجوال لم يُنفَّذ. لا عنوان إنتاج حقيقي للجوال. الاستعادة وPDF ووكيل HTTPS الحي بقوا خارج هذه المرحلة.

`ZERO NEW PRODUCT FEATURES`

## 1. الملخص التنفيذي

أُغلق تخزين رمز Electron بصيغة `plain:` وbase64. إذا لم يتوفر `safeStorage` لا يُكتب الرمز على القرص، وتبقى الجلسة في ذاكرة الواجهة حتى تسجيل الخروج أو إغلاق العملية. القيم القديمة ذات البادئة `plain:` تُحذف ولا تُعاد.

بُني مثبّت Windows غير موقّع محليًا دون نشر. تشغيل النسخة غير المثبّتة أظهر شاشة الدخول العربية. لم يُختبر التنقل بعد الدخول.

على الجوال، إنتاج وpreview لا يعودان إلى `127.0.0.1:8000`. الإنتاج يقبل HTTPS فقط. `usesCleartextTraffic` يصبح false عندما تكون `EXPO_PUBLIC_APP_ENV=production`. عنوان الإنتاج نفسه غير موجود، لذلك الجاهزية للإصدار تبقى محجوبة.

التصميم البصري لم يتغير.

## 2. الحالة الأولية

- الفرع `main`، الالتزام `0b7f7ae`، وشجرة العمل متسخة من المراحل السابقة وهذه التعديلات. لا commit ولا push.
- Electron 33.4.11 عبر electron-builder 25.1.8. الواجهة React 18 وVite 5.
- Expo SDK 57.0.0، React Native 0.86.3، المعرفان `com.odayos.app` و`os.oday.desktop` كما هما.
- MySQL المعزولة: `oday-financial-verification`، 8.0.46، `127.0.0.1:3307`، القاعدة `oday_financial_verification`. لم تُستخدم قاعدة `ninja`.

## 3. تحليل Electron

- العملية الرئيسية: `dashboard/electron/main.ts`. النافذة: `contextIsolation: true`، `sandbox: true`، `nodeIntegration: false`، `webviewTag: false`.
- التطوير يحمّل `VITE_DEV_SERVER_URL`. النسخة المغلفة تحمّل `oday://index.html` أو لوحة بعيدة إن وُجد عنوان مستجيب.
- `preload.ts` يعرض `window.oday` فقط: النافذة، المخزن، الملفات، الصدفة، الإشعار، الطباعة، النسخ، التحديث.
- `security.ts` يمنع النوافذ الجديدة وwebview، ويمنع الإبحار خارج التطوير و`oday://` و`file://` والأصول البعيدة المسموحة.
- التحديث: `electron-updater` من GitHub `m7madi8/oday-os`، ويتوقف في التطوير. لم يُرفع إصدار ولم يُطلب تحديث على تثبيت قائم.
- البروتوكول `oday://` يرفض المسارات التي تخرج من `dist`.

## 4. إصلاحات الأمان

الخلل: `store.ts` كان يكتب `plain:` ثم base64 عند غياب التشفير، والقراءة كانت تعيد القيمة.

التصحيح الأصغر:

- `vaultCodec.ts` يرفض كتابة `token` و`user` و`company` بلا تشفير.
- القراءة ترى `plain:` كقيمة تُحذف، ولا تُرجع السر.
- `session.js` يحتفظ بالجلسة في الذاكرة إذا رفض القرص الكتابة. `getToken` يقرأ الذاكرة أولًا. `clearSession` يمسحها ويحذف مفاتيح القرص.
- عنوان الخادم ليس سرًا. بلا تشفير يُحفظ ببادئة `cfg:` لا `plain:`.
- اسم ملف الطباعة لم يعد يُستخدم كمسار. `safePdfFileName` يأخذ اسم الملف فقط.
- قنوات IPC بقيت نفسها. المرسل يجب أن يكون `oday` أو `file` أو `http` أو `https`، والإبحار أصلًا مقيّد.

أثر التوافق: جهاز بلا `safeStorage` يسجّل الدخول في الجلسة الحالية ثم يطلب الدخول من جديد بعد إعادة التشغيل. لا تُنقل الأسرار القديمة تلقائيًا إلى تشفير.

## 5. بناء Windows

الأمر الأول:

```text
npm run desktop:dist
```

Vite نجح: 1793 وحدة، `dist` و`dist-electron`. electron-builder فشل لأن `release\win-unpacked\resources\app.asar` كان مقفولًا بعملية أخرى. لم تُغلق عملية المستخدم لإجبار البناء.

الأمر الثاني، بلا نشر، ومجلد خرج مختلف:

```text
npx electron-builder --win nsis --publish never --config.directories.output=release-phase6
```

النتيجة: نجاح. الملف `dashboard/release-phase6/ODAY-OS-Setup.exe`. السجل: `no signing info identified, signing is skipped`. `signAndEditExecutable` يبقى false. `ODAY-C-014` محجوب.

التشغيل: `release-phase6\win-unpacked\ODAY OS.exe` فتح نافذة. ظهرت شاشة الدخول، العنوان ODAY OS، الحقول العربية، زر «تسجيل الدخول»، وأزرار النافذة. لم يحدث انهيار ظاهر. لم يُدخل حساب. أُغلقت عمليات الاختبار تحت `release-phase6` فقط.

المثبّت: **لم يُنفَّذ**. تثبيته كان سيكتب اختصارات وقد يلمس تثبيتًا قائمًا.

## 6. تحليل Expo

- التوجيه: Expo Router. التبويبات: الرئيسية، المشاريع، العملاء، المالية، المزيد. شاشات إضافية موجودة: فاتورة، دفعة، مصروف، شيك، مستند، عميل، مشروع، ودخول، ومساعد.
- الرمز على الجهاز في SecureStore. على الويب يبقى localStorage كما كان.
- الخروج يحذف مفاتيح الجلسة.
- `shouldEndSession` لم يُمس.
- لا مزامنة دون اتصال ولا إشعارات جديدة.
- فشل الشبكة في العميل يرمي «تعذر الاتصال بالخادم». عنوان فارغ يرمي «لم يُضبط عنوان خادم HTTPS» قبل `fetch`.

## 7. إعدادات بناء الهاتف

| الوضع | السلوك |
|---|---|
| development | يجوز `http://127.0.0.1:8000` عند غياب عنوان. `usesCleartextTraffic=true`. ATS يسمح بالشبكة المحلية. |
| preview | لا رجوع إلى loopback. HTTP غير محلي مقبول للتجربة الداخلية. لا عنوان LAN في `eas.json`. |
| production | HTTPS غير loopback فقط، من العنوان المحفوظ أو `EXPO_PUBLIC_API_URL`. وإلا سلسلة فارغة. cleartext مغلق وATS لا يسمح بالتحميل الحر ولا بالشبكة المحلية. |

`npx expo config --type public` مع `EXPO_PUBLIC_APP_ENV=production` أظهر `usesCleartextTraffic: false` و`NSAllowsArbitraryLoads: false` و`NSAllowsLocalNetworking: false`. بدون المتغير بقي cleartext مسموحًا للتطوير.

المتغير العام ليس سرًا. لا مفاتيح خاصة داخل `EXPO_PUBLIC_*`.

حاجز الإصدار: لا قيمة إنتاج للعنوان، ولا شهادة توقيع مُولَّدة هنا، ولا `eas build`. سكربت `build:apk` ما زال يشير إلى preview ولم يُشغَّل.

## 8. التوافق مع Backend

العملاء الحاليون يستعملون المسارات القائمة في `CROSS_PLATFORM_COMPATIBILITY_MATRIX.md`.

عزل إعدادات المكتب بقي على الخادم. اختبار الشركتين نجح من جديد. مفتاح العميل ما زال `office-settings`.

المستندات والموظفون الأجانب بقوا 404 ضمن `Phase3IsolationTest`.

الاستعادة: `BackupRestoreBlockedTest` نجح. لم تُفعَّل.

المال: `FinancialMysqlVerificationTest` نجح على القاعدة المعزولة. لم تُقارن شاشة سطح مكتب بشاشة هاتف على نفس السجل لأن الهاتف لم يُشغَّل.

## 9. اختبارات التشغيل

ما نُفّذ فعلًا:

- فتح التطبيق المغلف غير المثبّت وظهور شاشة الدخول العربية.

ما لم يُنفَّذ:

- تثبيت NSIS وإزالته.
- الدخول والتنقل وتسجيل الخروج داخل التطبيق المغلف.
- تشغيل Expo على محاكي أو جهاز.
- بناء EAS.
- نشر تحديث Electron.

نجاح البناء لا يعني أن المثبّت مُختبَر.

## 10. الاختبارات الآلية

Dashboard، من `dashboard/`:

```text
npm test -- --run
```

14 ملفًا، 135 اختبارًا، نجاح. منها `vaultCodec` 7 و`printName` 2 و`session.desktop` 2. لا فشل ولا تخطٍّ.

Mobile، من `oday-mobile/`:

```text
npm test -- --run
```

4 ملفات، 13 اختبارًا، نجاح. منها `serverPolicy` 5.

PHPUnit على 3307:

```text
php vendor/phpunit/phpunit/phpunit tests/Unit/Oday/BackupRestoreBlockedTest.php tests/Feature/Oday/OfficeSettingsIsolationTest.php tests/Feature/Oday/OdayDashboardSyncAuthTest.php tests/Feature/Oday/FinancialMysqlVerificationTest.php tests/Feature/Oday/Phase3IsolationTest.php
```

19 اختبارًا، 140 تأكيدًا، OK.

بناء الواجهة: نجح داخل `desktop:dist` قبل فشل القفل على المجلد القديم.

تغليف: نجح في `release-phase6`. غير موقّع.

لم يُشغَّل: `eas build`، المثبّت، اختبارات جهاز الجوال، عاملان HTTP لمسح الشيك، توليد PDF.

## 11. الملفات المعدلة

- `dashboard/electron/ipc/vaultCodec.ts` — سياسة التخزين.
- `dashboard/electron/ipc/store.ts` — استخدام السياسة وحذف `plain:`.
- `dashboard/electron/ipc/printName.ts` و`print.ts` — اسم ملف آمن.
- `dashboard/electron/ipc/files.ts` — رفض بيانات فارغة واسم ملف أساسي.
- `dashboard/src/lib/auth/session.js` — جلسة الذاكرة عند رفض القرص.
- `dashboard/vite.config.js` — إدراج اختبارات Electron.
- `dashboard/.gitignore` — تجاهل `release-phase6`.
- `oday-mobile/lib/serverPolicy.ts` و`server.ts` — عنوان الإنتاج.
- `oday-mobile/lib/api/client.ts` — رفض الطلب بلا عنوان.
- `oday-mobile/app.config.js` — cleartext وATS حسب وضع الإنتاج.
- اختبارات `vaultCodec` و`printName` و`session.desktop` و`serverPolicy`.

لم تُمس حسابات المال ولا `BackupRestoreService` ولا ألوان الواجهة.

## 12. المشاكل المكتشفة

| المعرف | الشدة | الأثر | الحالة |
|---|---|---|---|
| ODAY-C-011 | P2 | رمز قابل للاسترجاع من ملف المستخدم بلا تشفير نظام | مغلق بالاختبار |
| ODAY-P6-001 | P2 | اسم طباعة قد يخرج من مجلد المؤقت | مغلق باختبار الاسم |
| ODAY-P1-008 | P1 | بناء إنتاج بلا خادم HTTPS حقيقي | مفتوح. الإخفاق الآمن مُنفَّذ |
| ODAY-C-014 | P2 | مثبّت غير موقّع | محجوب. لا شهادة |
| ODAY-P6-003 | P2 | المثبّت لم يُشغَّل | غير مُتحقَّق |

## 13. المشاكل المتبقية

- سطح المكتب: لا توقيع، والمثبّت لم يُثبَّت، والتنقل بعد الدخول لم يُختبر على النسخة المغلفة.
- الجوال: لا عنوان إنتاج، ولا بناء EAS، ولا تشغيل جهاز.
- إعداد: `ODAY-P1-006` PDF محجوب، وHTTPS خلف وكيل حي غير مُتحقَّق.
- استعادة: `ODAY-P1-009` محجوب. الأرشيف الحالي ليس استعادة كوارث كاملة.
- بيئة: أول تغليف فشل لقفل `app.asar` في `release\win-unpacked`.

## 14. سلامة المراحل السابقة

- الحسابات: `FinancialMysqlVerificationTest` نجح.
- التفويض والعزل: `Phase3IsolationTest` و`OfficeSettingsIsolationTest` نجحا.
- المسار القديم: 410 ضمن `OdayDashboardSyncAuthTest`.
- الاستعادة: 409 بقيت، والاختبار نجح.
- HTTPS: الوسيط من المرحلة 5 لم يُغيَّر.
- جلسة 401/403: اختبارات الواجهة والجوال ما زالت ناجحة.

## 15. ضبط نطاق المشروع

`ZERO NEW PRODUCT FEATURES`

لا شاشة ولا تبويب ولا دور ولا إشعار ولا دخول حيوي ولا طريقة دفع.

## 16. معايير قبول المرحلة

| المعيار | الحالة | الدليل |
|---|---|---|
| فهم معمارية سطح المكتب والجوال | VERIFIED | هذا التقرير والمصفوفة |
| منع تخزين الرمز غير المشفّر | VERIFIED | `vaultCodec.test.ts` |
| مراجعة IPC | VERIFIED | القائمة كما هي، وإصلاح اسم الطباعة |
| بناء React للإنتاج | VERIFIED | Vite، 1793 وحدة |
| تغليف Electron | VERIFIED | `release-phase6`، بلا نشر |
| تشغيل Windows | VERIFIED جزئيًا | شاشة الدخول فقط |
| تنفيذ المثبّت | NOT VERIFIED | لم يُشغَّل |
| إعداد الجوال | VERIFIED كسياسة | `serverPolicy.test.ts` و`expo config` |
| إلغاء رجوع الإنتاج إلى localhost | VERIFIED | الاختبار |
| عنوان إنتاج حقيقي | BLOCKED | غير موجود |
| بناء إصدار الجوال | NOT VERIFIED | لا `eas build` |
| عزل الشركات والاستعادة والمال | VERIFIED | 19 اختبار PHPUnit |
| لا مزايا ولا تغيير بصري | VERIFIED | نطاق الملفات |

## 17. جاهزية المرحلة السابعة

المرحلة 7، التحقق النهائي للإصدار، **ليست جاهزة كإذن نشر**.

يمكن بدء تدقيق QA على القيود المعروفة: التوقيع، تشغيل المثبّت في بيئة يمكن حذفها، عنوان HTTPS حقيقي للجوال، وبناء EAS، وPDF، واستعادة البيانات. لا تُغلق هذه البنود من نجاح البناء أو من شاشة الدخول وحدها.

لم تُبدأ المرحلة 7.
