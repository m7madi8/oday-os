# ODAY OS — Desktop Auto Update

تطبيق Windows يستخدم **Electron + electron-builder + electron-updater** مع **GitHub Releases** كمصدر للتحديثات.

## التطوير (Development)

```bash
cd dashboard
npm install
npm run desktop:dev
```

أثناء `desktop:dev` أو `npm run dev` **لا يتم** فحص التحديثات من GitHub.

## البناء المحلي (Build)

مثبّت Windows بدون رفع إلى GitHub:

```bash
cd dashboard
npm run desktop:dist
```

الناتج في `dashboard/release/`:

- `ODAY-OS-Setup.exe`
- `latest.yml`
- `*.blockmap`

## الإصدار (Release)

1. حدّث الإصدار في `dashboard/package.json` (Semantic Versioning):

   ```text
   1.0.2 → 1.0.3
   ```

2. Commit التغييرات.

3. أنشئ tag وادفعه:

   ```bash
   git tag v1.0.3
   git push origin v1.0.3
   ```

4. GitHub Actions (`desktop-release.yml`) يبني المثبّت ويرفع **GitHub Release** تلقائياً مع `latest.yml` وملفات blockmap.

### متطلبات GitHub

| الحقل | القيمة الحالية |
|--------|----------------|
| Owner | `m7madi8` |
| Repo | `oday-os` |
| Visibility | عام (public) |

للمستودعات الخاصة: لا تضع `GH_TOKEN` داخل التطبيق. استخدم `secrets.GITHUB_TOKEN` في CI فقط عند `electron-builder --publish always`.

### تجاوز مصدر التحديث (اختياري)

لاستضافة self-hosted بدل GitHub:

```env
ODAY_UPDATE_FEED_URL=https://your-server/desktop-updates
```

## سلوك التحديث عند العميل

```text
تشغيل التطبيق (production فقط)
  → فحص GitHub Releases
  → إن وُجد إصدار أحدث: تنزيل في الخلفية
  → عند اكتمال التنزيل: بطاقة «التحديث جاهز»
  → «تحديث الآن»: إغلاق + تثبيت + إعادة تشغيل
  → «لاحقاً»: إخفاء حتى إعادة تشغيل التطبيق
```

- بدون إنترنت: التطبيق يعمل بشكل طبيعي.
- فشل التحديث: لا يتوقف التطبيق؛ يُسجَّل في log العملية فقط.

## السجلات (Logging)

في Electron main process ابحث عن:

```text
[ODAY Update]
```

## نشر محلي على Laravel (legacy)

إذا أردت استضافة التحديثات على نفس خادم المكتب بدل GitHub:

```bash
npm run desktop:dist
npm run desktop:publish-local
```

ينسخ الملفات إلى `public/desktop-updates/` في جذر المشروع.
