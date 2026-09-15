# تحديثات تطبيق ODAY OS لسطح المكتب

ضع هنا مخرجات `npm run desktop:build` من مجلد `dashboard`:

- `latest.yml`
- `ODAY-OS-Setup.exe`
- ملف `.blockmap` إن وُجد
- `version.json` (يُكتب تلقائيًا)

التطبيق المثبت يتحقق من `{عنوان الخادم}/desktop-updates` ومن `/api/oday/desktop/version`.
عند وجود إصدار أحدث يُنزَّل ويُثبَّت فورًا مع إشعار.
