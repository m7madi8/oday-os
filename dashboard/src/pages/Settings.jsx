import { useEffect, useRef, useState } from 'react';
import {
  Briefcase,
  Check,
  Download,
  GripVertical,
  Loader2,
  Plus,
  Trash2,
  Upload,
  Wallet,
} from 'lucide-react';
import { BRAND } from '../brand';
import { C, CURRENCIES, FONT_HEAD, PALETTES } from '../theme';
import { BrandLogo } from '../components/BrandLogo';
import { Field, SectionCard, Segmented, SelectInput, TextArea, TextInput } from '../components/settings/Fields';
import { COUNTRY_CODES, createId } from '../lib/officeSettings';
import { getItem, setItem } from '../lib/storage';
import { BackupPanel } from '../components/backup/BackupPanel';

const TOC = [
  { id: 'identity', label: 'بيانات المكتب' },
  { id: 'payments', label: 'البنوك والدفع' },
  { id: 'services', label: 'أتعاب الخدمات' },
  { id: 'expenses', label: 'فئات المصاريف' },
  { id: 'backup', label: 'النسخ الاحتياطي' },
];

function scrollToSection(id) {
  const root = document.querySelector('[data-app-scroll]');
  const el = document.getElementById(id);
  if (!root || !el) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const top = el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - 16;
  root.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
}

export function Settings({ settings, onChange, onSave, status, loaded, onImported }) {
  const [active, setActive] = useState('identity');
  const [logoError, setLogoError] = useState('');
  const [importError, setImportError] = useState('');
  const [confirmImport, setConfirmImport] = useState(null);
  const fileLogoRef = useRef(null);
  const fileBackupRef = useRef(null);

  useEffect(() => {
    const root = document.querySelector('[data-app-scroll]');
    if (!root) return undefined;
    const ids = TOC.map((item) => item.id);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActive(visible.target.id);
      },
      { root, rootMargin: '-18% 0px -62% 0px', threshold: [0.1, 0.35, 0.6] },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [loaded]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('section') === 'backup') {
      scrollToSection('backup');
    }
  }, [loaded]);

  function patch(partial) {
    onChange({ ...settings, ...partial });
  }

  function addService() {
    const next = { id: createId(), name: '', hours: '', rate: '' };
    patch({ projectTypes: [...settings.projectTypes, next] });
    requestAnimationFrame(() => {
      document.getElementById(`project-name-${next.id}`)?.focus();
    });
  }

  function updateService(id, partial) {
    patch({
      projectTypes: settings.projectTypes.map((row) => (row.id === id ? { ...row, ...partial } : row)),
    });
  }

  function removeService(id) {
    patch({ projectTypes: settings.projectTypes.filter((row) => row.id !== id) });
  }

  function addExpense() {
    const next = { id: createId(), name: '' };
    patch({ expenseCategories: [...settings.expenseCategories, next] });
    requestAnimationFrame(() => {
      document.getElementById(`expense-name-${next.id}`)?.focus();
    });
  }

  function updateExpense(id, partial) {
    patch({
      expenseCategories: settings.expenseCategories.map((row) => (row.id === id ? { ...row, ...partial } : row)),
    });
  }

  function removeExpense(id) {
    patch({ expenseCategories: settings.expenseCategories.filter((row) => row.id !== id) });
  }

  function onLogoFile(file) {
    setLogoError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setLogoError('ارفع صورة بصيغة PNG أو JPG.');
      return;
    }
    if (file.size > 800 * 1024) {
      setLogoError('حجم الشعار يجب أن يكون أقل من 800 كيلوبايت.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      patch({ customLogo: String(reader.result || ''), useSystemLogo: false });
    };
    reader.readAsDataURL(file);
  }

  async function exportBackup() {
    const [dashboard, notes] = await Promise.all([
      getItem('dashboard-settings'),
      getItem('quick-notes'),
    ]);
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      officeSettings: settings,
      dashboardSettings: dashboard?.value ? JSON.parse(dashboard.value) : null,
      quickNotes: notes?.value || '',
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `oday-os-backup-${stamp}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function onBackupFile(file) {
    setImportError('');
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ''));
        if (!parsed || typeof parsed !== 'object') throw new Error('invalid');
        setConfirmImport(parsed);
      } catch {
        setImportError('تعذر قراءة الملف. تأكد أنه نسخة احتياطية صحيحة.');
      }
    };
    reader.readAsText(file);
  }

  async function applyImport() {
    if (!confirmImport) return;
    try {
      if (confirmImport.officeSettings) {
        await setItem('office-settings', JSON.stringify(confirmImport.officeSettings));
      }
      if (confirmImport.dashboardSettings) {
        await setItem('dashboard-settings', JSON.stringify(confirmImport.dashboardSettings));
      }
      if (typeof confirmImport.quickNotes === 'string') {
        await setItem('quick-notes', confirmImport.quickNotes);
      }
      await onImported?.(confirmImport);
      setConfirmImport(null);
    } catch {
      setImportError('فشل استيراد النسخة. حاول مرة أخرى.');
    }
  }

  const saveLabel = status === 'saving' ? 'جارِ الحفظ' : status === 'saved' ? 'تم الحفظ' : 'حفظ الإعدادات';

  return (
    <div className="space-y-5 min-w-0 pb-10">
      <div
        className="os-surface px-5 sm:px-7 py-5 flex flex-wrap items-start justify-between gap-4"
        style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8 }}
      >
        <div>
          <h1 className="phone-hide text-2xl sm:text-3xl font-bold" style={{ color: C.ink, fontFamily: FONT_HEAD }}>
            إعدادات المكتب
          </h1>
          <p className="phone-hide text-base mt-1 max-w-xl" style={{ color: C.inkSoft }}>
            بيانات المكتب الهندسي، الأتعاب، والعملة — تُحفظ على هذا الجهاز.
          </p>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={!loaded || status === 'saving'}
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-base font-medium min-h-11"
          style={{ background: C.sidebar, color: C.sidebarTitle }}
        >
          {status === 'saving' ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : null}
          {status === 'saved' ? <Check size={15} aria-hidden="true" /> : null}
          {saveLabel}
        </button>
      </div>

      <div className="settings-shell">
        <nav
          className="os-surface settings-toc p-2"
          style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8 }}
          aria-label="أقسام الإعدادات"
        >
          <div className="settings-toc-list">
            {TOC.map((item, index) => {
              const selected = active === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(event) => {
                    event.preventDefault();
                    setActive(item.id);
                    scrollToSection(item.id);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] whitespace-nowrap min-h-11"
                  aria-current={selected ? 'true' : undefined}
                  style={{
                    background: selected ? C.tint : 'transparent',
                    color: selected ? C.ink : C.inkSoft,
                    fontWeight: selected ? 600 : 400,
                    borderRadius: 8,
                  }}
                >
                  <span className="tabular-nums text-[10px]" style={{ color: C.inkFaint }}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {item.label}
                </a>
              );
            })}
          </div>
        </nav>

        <div className="flex-1 min-w-0 space-y-4">
          <SectionCard
            id="identity"
            num={1}
            title="بيانات المكتب الهندسي"
            hint="الاسم الرسمي للمكتب، اللغة، ووسائل التواصل في فلسطين."
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-4">
                <Field label="اسم المكتب / الشركة" htmlFor="office-name">
                  <TextInput
                    id="office-name"
                    value={settings.officeName}
                    onChange={(e) => patch({ officeName: e.target.value })}
                    placeholder={BRAND.firmAr}
                    autoComplete="organization"
                  />
                </Field>
                <Field label="لغة الواجهة">
                  <Segmented
                    ariaLabel="لغة الواجهة"
                    value={settings.language}
                    onChange={(language) => patch({ language })}
                    options={[
                      { id: 'ar', label: 'العربية' },
                      { id: 'en', label: 'English' },
                    ]}
                  />
                </Field>
              </div>

              <div className="rounded-2xl p-4 space-y-4" style={{ background: C.tint, border: `1px solid ${C.border}` }}>
                <div className="text-[12px] font-medium" style={{ color: C.inkSoft }}>
                  معلومات التواصل
                </div>
                <Field label="رقم الهاتف الجوال" htmlFor="office-phone">
                  <div className="flex gap-2">
                    <SelectInput
                      aria-label="رمز الدولة"
                      value={settings.countryCode}
                      onChange={(e) => patch({ countryCode: e.target.value })}
                      className="max-w-[9.5rem]"
                    >
                      {COUNTRY_CODES.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.label}
                        </option>
                      ))}
                    </SelectInput>
                    <TextInput
                      id="office-phone"
                      type="tel"
                      inputMode="tel"
                      value={settings.phone}
                      onChange={(e) => patch({ phone: e.target.value })}
                      placeholder="059xxxxxxx"
                      autoComplete="tel-national"
                    />
                  </div>
                </Field>
                <Field label="البريد الإلكتروني" htmlFor="office-email">
                  <TextInput
                    id="office-email"
                    type="email"
                    value={settings.email}
                    onChange={(e) => patch({ email: e.target.value })}
                    placeholder="office@example.com"
                    autoComplete="email"
                    dir="ltr"
                    className="text-left"
                  />
                </Field>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            id="letterhead"
            num={2}
            title="الورقة الرسمية والعناوين"
            hint="ما يظهر على الفواتير، العقود، والمراسلات الرسمية للمكتب."
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Field label="وصف المكتب" htmlFor="office-tagline">
                <TextArea
                  id="office-tagline"
                  rows={3}
                  value={settings.tagline}
                  onChange={(e) => patch({ tagline: e.target.value })}
                  placeholder={BRAND.tagline}
                />
              </Field>
              <Field label="عنوان المكتب" htmlFor="office-address">
                <TextArea
                  id="office-address"
                  rows={3}
                  value={settings.address}
                  onChange={(e) => patch({ address: e.target.value })}
                  placeholder="رام الله، فلسطين — الحي، الشارع"
                />
              </Field>
              <Field label="الواتساب" htmlFor="office-whatsapp">
                <TextInput
                  id="office-whatsapp"
                  type="tel"
                  value={settings.whatsapp}
                  onChange={(e) => patch({ whatsapp: e.target.value })}
                  placeholder="+97059xxxxxxx"
                  dir="ltr"
                  className="text-left"
                />
              </Field>
              <Field label="الموقع الإلكتروني" htmlFor="office-website">
                <TextInput
                  id="office-website"
                  type="url"
                  value={settings.website}
                  onChange={(e) => patch({ website: e.target.value })}
                  placeholder="https://"
                  dir="ltr"
                  className="text-left"
                />
              </Field>
            </div>

            <div id="payments" className="scroll-mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <Field label="رقم الحساب / IBAN" htmlFor="bank-account">
                <TextInput
                  id="bank-account"
                  value={settings.bankAccount}
                  onChange={(e) => patch({ bankAccount: e.target.value })}
                  placeholder="PS00 XXXX 0000 0000 0000 0000 0000 0"
                  dir="ltr"
                  className="text-left"
                />
              </Field>
              <Field label="اسم البنك" htmlFor="bank-name">
                <TextInput
                  id="bank-name"
                  value={settings.bankName}
                  onChange={(e) => patch({ bankName: e.target.value })}
                  placeholder="بنك فلسطين / بنك القاهرة عمان"
                />
              </Field>
              <Field label="اسم المستفيد" htmlFor="bank-beneficiary">
                <TextInput
                  id="bank-beneficiary"
                  value={settings.beneficiary}
                  onChange={(e) => patch({ beneficiary: e.target.value })}
                />
              </Field>
              <Field label="عملة الدفع">
                <Segmented
                  ariaLabel="عملة الدفع"
                  value={settings.paymentCurrency}
                  onChange={(paymentCurrency) => patch({ paymentCurrency })}
                  options={Object.values(CURRENCIES).map((item) => ({ id: item.id, label: item.label }))}
                />
              </Field>
            </div>

            <div className="mt-5 rounded-2xl p-4" style={{ background: C.paper, border: `1px solid ${C.border}` }}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-3 cursor-pointer min-h-11">
                  <input
                    type="checkbox"
                    checked={settings.useSystemLogo}
                    onChange={(e) => patch({ useSystemLogo: e.target.checked })}
                    className="size-4"
                    style={{ accentColor: 'var(--c-focus)' }}
                  />
                  <span className="text-sm" style={{ color: C.ink }}>
                    استخدام شعار المكتب الافتراضي
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => fileLogoRef.current?.click()}
                  className="rounded-xl px-3.5 py-2 text-sm min-h-11"
                  style={{ background: C.card, border: `1px solid ${C.border}`, color: C.ink }}
                >
                  رفع شعار خاص
                </button>
                <input
                  ref={fileLogoRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => onLogoFile(e.target.files?.[0])}
                />
              </div>
              <div className="mt-4 flex items-center gap-4">
                <div
                  className="rounded-xl flex items-center justify-center overflow-hidden"
                  style={{ width: 88, height: 64, background: C.card, border: `1px solid ${C.border}` }}
                >
                  {settings.useSystemLogo || !settings.customLogo ? (
                    <BrandLogo variant="mark" decorative style={{ height: 36, width: 'auto' }} />
                  ) : (
                    <img src={settings.customLogo} alt="" className="max-h-12 max-w-[4.5rem] object-contain" />
                  )}
                </div>
                <p className="text-[12px]" style={{ color: C.inkFaint }}>
                  يظهر الشعار على الفواتير والورقة الرسمية.
                </p>
              </div>
              {logoError && (
                <p className="text-[12px] mt-2" style={{ color: C.burgundy }} role="alert">
                  {logoError}
                </p>
              )}
            </div>
          </SectionCard>

          <SectionCard
            id="theme"
            num={3}
            title="التصميم واللمسات"
            hint="اختر لوحة تناسب هوية المكتب وتُطبَّق فورًا على النظام."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {PALETTES.map((palette) => {
                const selected = settings.paletteId === palette.id;
                return (
                  <button
                    key={palette.id}
                    type="button"
                    onClick={() => patch({ paletteId: palette.id })}
                    aria-pressed={selected}
                    className="text-right rounded-2xl p-4 min-h-[5.5rem] transition-shadow"
                    style={{
                      background: C.paper,
                      border: `1.5px solid ${selected ? C.lime : C.border}`,
                      boxShadow: selected ? `0 0 0 3px color-mix(in srgb, ${palette.swatches[1]} 18%, transparent)` : 'none',
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-3">
                      {palette.swatches.map((color) => (
                        <span
                          key={color}
                          className="size-4 rounded-full"
                          style={{ background: color, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)' }}
                        />
                      ))}
                    </div>
                    <div className="text-sm font-medium" style={{ color: C.ink }}>
                      {palette.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard
            id="services"
            num={4}
            title="أتعاب الخدمات الهندسية"
            hint="عرّف مراحل العمل وأتعابها — تصميم، مخططات، إشراف، أو تنسيق مواقع."
          >
            {settings.projectTypes.length === 0 ? (
              <div
                className="rounded-2xl px-5 py-10 text-center"
                style={{ background: C.paper, border: `1px dashed ${C.border}` }}
              >
                <span
                  className="inline-flex items-center justify-center rounded-2xl mb-3"
                  style={{ width: 44, height: 44, background: C.tint, color: C.ink }}
                >
                  <Briefcase size={20} strokeWidth={1.7} aria-hidden="true" />
                </span>
                <p className="text-sm font-medium" style={{ color: C.ink }}>
                  لا توجد خدمات بعد
                </p>
                <p className="text-[12px] mt-1 max-w-sm mx-auto" style={{ color: C.inkSoft }}>
                  مثال: تصميم معماري، مخططات تنفيذية، إشراف موقع، تنسيق مواقع، أو دراسة جدوى.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div
                  className="hidden md:grid service-row-head gap-2 px-2 text-[11px]"
                  style={{ color: C.inkFaint }}
                >
                  <span>المرحلة / الخدمة</span>
                  <span>الكمية</span>
                  <span>الأتعاب · {currency.symbol}</span>
                  <span className="sr-only">حذف</span>
                </div>
                {settings.projectTypes.map((row) => (
                  <div
                    key={row.id}
                    className="service-row items-center rounded-lg p-2 sm:p-1.5"
                    style={{ background: C.paper, border: `1px solid ${C.border}` }}
                  >
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="hidden md:flex p-1" style={{ color: C.inkFaint }} aria-hidden="true">
                        <GripVertical size={14} />
                      </span>
                      <TextInput
                        id={`project-name-${row.id}`}
                        value={row.name}
                        onChange={(e) => updateService(row.id, { name: e.target.value })}
                        placeholder="مثال: مخططات تنفيذية"
                        aria-label="المرحلة أو الخدمة"
                      />
                    </div>
                    <TextInput
                      type="number"
                      min="0"
                      inputMode="decimal"
                      value={row.hours}
                      onChange={(e) => updateService(row.id, { hours: e.target.value })}
                      placeholder="0"
                      aria-label="الكمية"
                      className="tabular-nums"
                    />
                    <TextInput
                      type="number"
                      min="0"
                      inputMode="decimal"
                      value={row.rate}
                      onChange={(e) => updateService(row.id, { rate: e.target.value })}
                      placeholder="0.00"
                      aria-label="الأتعاب"
                      className="tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() => removeService(row.id)}
                      aria-label="حذف الخدمة"
                      className="inline-flex items-center justify-center rounded-xl min-h-11 min-w-11"
                      style={{ color: C.burgundy }}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={addService}
              className="mt-3 inline-flex items-center gap-1.5 text-sm min-h-11 px-2"
              style={{ color: C.ink }}
            >
              <Plus size={16} aria-hidden="true" />
              إضافة خدمة
            </button>
          </SectionCard>

          <SectionCard
            id="expenses"
            num={5}
            title="فئات مصاريف المكتب"
            hint="صنّف مصاريف المكتب والمواقع لتسهيل المتابعة والتقارير."
          >
            {settings.expenseCategories.length === 0 ? (
              <div
                className="rounded-2xl px-5 py-10 text-center"
                style={{ background: C.paper, border: `1px dashed ${C.border}` }}
              >
                <span
                  className="inline-flex items-center justify-center rounded-2xl mb-3"
                  style={{ width: 44, height: 44, background: C.tint, color: C.ink }}
                >
                  <Wallet size={20} strokeWidth={1.7} aria-hidden="true" />
                </span>
                <p className="text-sm font-medium" style={{ color: C.ink }}>
                  لا توجد فئات مصاريف بعد
                </p>
                <p className="text-[12px] mt-1" style={{ color: C.inkSoft }}>
                  مثال: مواد رسم، برامج CAD، مواصلات مواقع، تأمينات، أو رسوم بلدية.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {settings.expenseCategories.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center gap-2 rounded-xl p-1.5"
                    style={{ background: C.paper, border: `1px solid ${C.border}` }}
                  >
                    <TextInput
                      id={`expense-name-${row.id}`}
                      value={row.name}
                      onChange={(e) => updateExpense(row.id, { name: e.target.value })}
                      placeholder="اسم الفئة"
                      aria-label="فئة المصروف"
                    />
                    <button
                      type="button"
                      onClick={() => removeExpense(row.id)}
                      aria-label="حذف الفئة"
                      className="inline-flex items-center justify-center rounded-xl min-h-11 min-w-11 shrink-0"
                      style={{ color: C.burgundy }}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={addExpense}
              className="mt-3 inline-flex items-center gap-1.5 text-sm min-h-11 px-2"
              style={{ color: C.ink }}
            >
              <Plus size={16} aria-hidden="true" />
              إضافة فئة
            </button>
          </SectionCard>

          <SectionCard
            id="backup"
            num={6}
            title="النسخ والاستيراد"
            hint="نسخ احتياطي مشفّر إلى Google Drive ومجلد محلي، مع تصدير JSON سريع للإعدادات."
          >
            <BackupPanel />
            <div className="flex flex-wrap gap-2 mt-5">
              <button
                type="button"
                onClick={exportBackup}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm min-h-11"
                style={{ background: C.sidebar, color: C.sidebarTitle }}
              >
                <Download size={15} aria-hidden="true" />
                تصدير نسخة
              </button>
              <button
                type="button"
                onClick={() => fileBackupRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm min-h-11"
                style={{ background: C.paper, border: `1px solid ${C.border}`, color: C.ink }}
              >
                <Upload size={15} aria-hidden="true" />
                استيراد نسخة
              </button>
              <input
                ref={fileBackupRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  onBackupFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </div>
            <p className="text-[12px] mt-3" style={{ color: C.inkFaint }}>
              تصدير JSON أدناه للإعدادات السريعة فقط — النسخ الرسمي المشفّر أعلاه.
            </p>
            {importError && (
              <p className="text-[12px] mt-2" style={{ color: C.burgundy }} role="alert">
                {importError}
              </p>
            )}
            {confirmImport && (
              <div
                className="mt-4 rounded-lg p-4"
                style={{ background: C.burgundySoft, border: `1px solid ${C.burgundyLine}` }}
              >
                <p className="text-sm" style={{ color: C.burgundy }}>
                  الاستيراد يستبدل الإعدادات الحالية. هل تريد المتابعة؟
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    type="button"
                    onClick={applyImport}
                    className="rounded-lg px-4 py-2 text-sm min-h-11 text-white"
                    style={{ background: C.burgundy }}
                  >
                    نعم، استورد
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmImport(null)}
                    className="rounded-lg px-4 py-2 text-sm min-h-11"
                    style={{ background: C.card, border: `1px solid ${C.border}`, color: C.ink }}
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
