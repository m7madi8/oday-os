# مصفوفة التوافق بين المنصات — المرحلة 6

Electron يشغّل نفس واجهة React. الجوال يستخدم Expo Router وعميل API الخاص به. الخادم يبقى Laravel وInvoice Ninja. لم تُضف عمليات جديدة ليكتمل التطابق بين المنصات.

المصادقة في المسارات الثلاثة: رأس `X-API-TOKEN`. رفض الصلاحية لا ينهي الجلسة إلا حسب `shouldEndSession` من المرحلة 4.

| المسار | React | Electron | Expo | نقطة النهاية | التحقق |
|---|---|---|---|---|---|
| الدخول والخروج | موجود | نفس الواجهة | `app/(auth)/login.tsx` | `/api/oday/mobile/login` و`logout` و`session` | اختبارات الجلسة. تشغيل Electron أظهر شاشة الدخول فقط. |
| حفظ الرمز | `sessionStorage` | ذاكرة الواجهة، والقرص فقط عبر `safeStorage` | `expo-secure-store` على الجهاز، و`localStorage` على الويب | — | `vaultCodec.test.ts` و`session.desktop.test.js`. |
| عنوان الخادم | `VITE_ODAY_API_URL` | مخزن سطح المكتب `serverUrl` | `EXPO_PUBLIC_API_URL` أو عنوان محفوظ | — | الإنتاج على الجوال يرفض غير HTTPS والـ loopback. |
| لوحة الملخص | موجودة | نفس الواجهة | `(tabs)/index.tsx` | `/api/oday/mobile/overview` | فحص مصدر. لا تشغيل جوال. |
| المشاريع | موجودة | نفس الواجهة | `(tabs)/projects.tsx` و`projects/[id].tsx` | `/api/v1/projects` | فحص مصدر. |
| العملاء | موجودة | نفس الواجهة | `(tabs)/clients.tsx` و`clients/[id].tsx` | `/api/v1/clients` | فحص مصدر. |
| الفواتير | موجودة | نفس الواجهة | `finance/invoices.tsx` | `/api/v1/invoices` | اختبارات الدقة على الخادم. |
| الدفعات | موجودة | نفس الواجهة | `finance/payments.tsx` | `/api/v1/payments` | `FinancialMysqlVerificationTest`. |
| المصروفات | موجودة | نفس الواجهة | `finance/expenses.tsx` | `/api/v1/expenses` | الاختبار المالي نفسه. |
| الشيكات | موجودة | نفس الواجهة | `finance/cheques.tsx` | `/api/oday/mobile/cheques` | اختبارات الخادم. لا عاملين HTTP متزامنين. |
| المستندات | موجودة | نفس الواجهة | `documents.tsx` | `/api/v1/documents` | عزل الشركة من `Phase3IsolationTest`. |
| إعدادات المكتب | موجودة | نفس الواجهة | `lib/api/dashboard.ts` | `/api/oday/mobile/office-settings` | `OfficeSettingsIsolationTest`. المفتاح الظاهر للعميل لم يُعدَّل. |
| التقارير المالية | موجودة | نفس الواجهة | غير موجودة | `/api/v1/reports/office-summary` | لا تُضاف للجوال في هذه المرحلة. |
| الرواتب | موجودة | نفس الواجهة | غير موجودة | مسارات الرواتب الحالية | لا تُضاف للجوال. |
| النسخ الاحتياطي | موجود | نفس الواجهة مع حوار مجلد | غير موجود | `/api/backup/*` | الاستعادة تبقى 409. لم يُنفَّذ تنزيل حي. |
| المساعد | عنصر نائب | نفس الواجهة | `ai/index.tsx` | `/api/oday/mobile/ai/chat` | لم يُستدعَ مزود خارجي. |

حالة التحقق:

- فحص ثابت: المسارات أعلاه من المصدر.
- اختبار وحدة: جلسة الواجهة، سياسة عنوان الجوال، دقة المبالغ.
- اختبار قاعدة: العزل المالي وإعدادات المكتب والاستعادة على MySQL المعزولة.
- تشغيل مغلف: Electron حتى شاشة الدخول. لا دخول بحساب، ولا تشغيل جوال على جهاز.
