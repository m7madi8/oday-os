# مصفوفة الاختبار المتكامل — المرحلة 7B

`PASS` هنا يعني أن الأمر نُفّذ في هذه المرحلة. اختبار HTTP ليس اختبار متصفح.

| Test ID | Module | Scenario | Platform | Method | Expected | Actual | Status | Evidence | Issue |
|---|---|---|---|---|---|---|---|---|---|
| E2E-AUTH-01 | Auth | رمز صالح ومفقود ورفض صلاحية | Backend | HTTP | الرفض لا يكتب بيانات شركة أخرى | 403 عند غياب الرمز، ومسارات المال تفحص الصلاحية | PASS | `FinancialMysqlVerificationTest` و`Phase3IsolationTest` | — |
| E2E-AUTH-02 | Auth | خروج وتبديل حساب من الواجهة | Browser | UI | الجلسة تُمسح ولا تتسرب | لم يُفتح متصفح | NOT RUN | — | — |
| E2E-CLIENT-01 | Clients | إنشاء عميل وربطه بفاتورة | Backend | HTTP | المبلغ والعملة يُحفظان مع العميل | فاتورة `10.10` ومصروف عشري | PASS | `test_invoice_and_expense_decimal_amounts_persist` | — |
| E2E-CLIENT-02 | Clients | نموذج العميل في المتصفح وإعادة التحميل | Browser | UI | الصفحة تعرض السجل بعد التحديث | لم يُفتح المتصفح | NOT RUN | — | — |
| E2E-PROJECT-01 | Projects | إنشاء مشروع من الواجهة | Browser | UI | المشروع يبقى بعد التحديث | لا اختبار HTTP مخصص لنموذج المشروع في هذه الجولة | NOT RUN | — | — |
| E2E-INVOICE-01 | Invoices | إنشاء فاتورة بالمسار الحالي | Backend | HTTP | `10.10` يُحفظ كما أُرسل | نجح ضمن الاختبار المالي | PASS | `FinancialMysqlVerificationTest` | — |
| E2E-PAY-01 | Payments | دفعة من شيك وارد بلا تكرار | Backend | HTTP | دفعة واحدة بالمبلغ العشري | ILS وUSD وJOD، والمسح الثاني لا يضيف دفعة | PASS | `test_clearing_persists_decimal_amounts` | — |
| E2E-CHQ-01 | Cheques | إنشاء وانتقالات وعزل شركة | Backend | HTTP | شركة أخرى لا ترى الشيك | 11 اختباراً | PASS | `ChequeApiTest` | — |
| E2E-CHQ-02 | Cheques | عاملان HTTP يمسحان الشيك نفسه | Backend | HTTP | دفعة واحدة | نجح. الحالة `cleared` | PASS | `ConcurrentChequeClearTest` | ODAY-P3-007 |
| E2E-CHQ-03 | Cheques | فشل حفظ الدفعة | Backend | HTTP | الشيك يبقى `processing` بلا دفعة | نجح | PASS | `test_failed_payment_save` | — |
| E2E-EXP-01 | Expenses | مبلغ عشري وشركة | Backend | HTTP | القيمة تُحفظ | نجح | PASS | الاختبار المالي | — |
| E2E-PAYROLL-01 | Payroll | راتب ومصروف واحد ومنع التكرار | Backend | HTTP | لا مصروف ثانٍ للفترة | 3 اختبارات رواتب والاختبار المالي | PASS | `PayrollApiTest` | — |
| E2E-RPT-01 | Reports | `office-summary` وفصل العملات | Backend | HTTP | المجموع من الخادم لا من المتصفح | نجح | PASS | `FinancialMysqlVerificationTest` و`OfficeReportFiguresTest` | — |
| E2E-RPT-02 | Reports | CSV والطباعة من الصفحة | Browser | UI | الأرقام تطابق الخادم | لم تُفتح الصفحة | NOT RUN | — | — |
| E2E-DOC-01 | Documents | مستند شركة أخرى | Backend | HTTP | 404 | نجح | PASS | `Phase3IsolationTest` | — |
| E2E-DOC-02 | Documents | رفع وتنزيل من الواجهة | Browser | UI | الملف يعود لصاحبه | لم يُنفَّذ | NOT RUN | — | — |
| E2E-SET-01 | Settings | إعدادات مكتبين | Backend | HTTP | لا قراءة للقيمة القديمة المشتركة | نجح | PASS | `OfficeSettingsIsolationTest` | — |
| E2E-BAK-01 | Backup | نطاق الأرشيف ومنع تنزيل غير الموسوم والاستعادة | Backend | HTTP | لا `database.sql`، و409 للاستعادة وللتنزيل غير الموسوم | نجح | PASS | `BackupArchiveScopeTest` و`BackupRestoreBlockedTest` | ODAY-P1-009 |
| E2E-PDF-01 | PDF | قالب فاتورة Invoice Ninja | Backend | HTTP | PDF للفاتورة بلا مولّد مستضاف | لم يُولَّد القالب | NOT RUN | المرحلة 7A ولّدت HTML تجريبياً فقط | ODAY-P1-006 |
| E2E-FAIL-01 | Runtime | إيقاف الخادم أو القاعدة | Backend | HTTP | رسالة بلا أسرار | لم يُوقف خادم | NOT RUN | — | — |
| E2E-UI-01 | Dashboard | الشاشات الخمس عشرة في المتصفح | Browser | UI | التنقل والتحديث | لم يُفتح المتصفح على خادم معزول | NOT RUN | Vitest 135 يغطي وحدات لا الصفحات الحية | — |
| E2E-EL-01 | Electron | دخول حساب اختبار وتنقل وخروج | Electron | UI | الجلسة المشفّرة تعمل | لم يُشغَّل بحساب | NOT RUN | شاشة الدخول فقط من المرحلة 6 | ODAY-P7A-003 |
| E2E-EL-02 | Electron | تشغيل المثبّت | Windows | Installer | تثبيت وإزالة دون المساس بتثبيت قائم | لم يُشغَّل | BLOCKED | لا بيئة Windows معزولة | ODAY-P7A-002 |
| E2E-MOB-01 | Expo | تشغيل جهاز أو محاكي | Mobile | UI | دخول وشاشات مالية | `adb` غير موجود | BLOCKED | Vitest 13 للسياسة فقط | ODAY-P1-008 |
