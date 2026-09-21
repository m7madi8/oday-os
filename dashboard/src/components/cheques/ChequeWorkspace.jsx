import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { C } from '../../theme';
import { Field, Segmented, TextInput, TextArea } from '../settings/Fields';
import { ClientSelect } from '../ui/ResourcePage';
import { ProjectSelect } from '../documents/ProjectSelect';
import { PrimaryButton, GhostButton } from '../ui/Actions';
import { ChequeBankSelect } from './ChequeBankSelect';
import { ChequePreviewPanel } from './ChequePreviewPanel';
import { listClients } from '../../lib/api/clients';
import { listProjects } from '../../lib/api/projects';
import { listInvoices } from '../../lib/api/invoices';
import {
  createCheque,
  updateCheque,
  fetchChequeInvoiceBalance,
  fetchChequeTemplateOverride,
} from '../../lib/api/cheques';
import { uploadProjectDocument, listDocuments, updateDocumentMeta } from '../../lib/api/documents';
import { invalidateFinance } from '../../lib/query';
import { showToast } from '../../lib/toast';
import { todayIso } from '../../lib/labels';
import { CHEQUE_CURRENCIES } from '../../lib/cheques/currencyConfig';
import { analyzePalestinianIban, IBAN_STATUS, normalizeIban } from '../../lib/cheques/iban';
import { mapChequeToPreviewData } from '../../lib/cheques/chequeMappers';
import { resolveChequeTemplate } from '../../lib/cheques/templates/registry';
import { isTerminal } from '../../lib/cheques/statusWorkflow';
import { goToChequeDetail } from '../../lib/routing/appRoutes';
import { ApiError } from '../../lib/api/client';

const CURRENCY_OPTIONS = Object.keys(CHEQUE_CURRENCIES);

function emptyForm(direction = 'incoming') {
  return {
    direction,
    client_id: '',
    project_id: '',
    invoice_id: '',
    payee_name: '',
    amount: '',
    currency_code: 'ILS',
    bank_id: '',
    bank_name: '',
    number: '',
    issue_date: todayIso(),
    due_date: '',
    account_reference: '',
    iban: '',
    notes: '',
    scan_document_id: '',
  };
}

function mapApiToForm(cheque) {
  return {
    direction: cheque.direction === 'out' ? 'outgoing' : cheque.direction,
    client_id: cheque.client_id || '',
    project_id: cheque.project_id || '',
    invoice_id: cheque.invoice_id || '',
    payee_name: cheque.payee || '',
    amount: cheque.amount != null ? String(cheque.amount) : '',
    currency_code: cheque.currency || 'ILS',
    bank_id: cheque.bank_id || '',
    bank_name: cheque.bank_name || '',
    number: cheque.cheque_number || cheque.number || '',
    issue_date: cheque.issue_date || todayIso(),
    due_date: cheque.due_date || '',
    account_reference: cheque.account_reference || '',
    iban: '',
    notes: cheque.notes || '',
    scan_document_id: cheque.scan_document_id || '',
  };
}

function fieldErrorsFromApi(error) {
  const errors = error?.payload?.errors;
  if (!errors) return {};
  const map = {};
  Object.entries(errors).forEach(([key, messages]) => {
    map[key] = Array.isArray(messages) ? messages[0] : String(messages);
  });
  return map;
}

export function ChequeWorkspace({ mode, cheque, hidden, onDone, onCancel }) {
  const isEdit = mode === 'edit' && cheque;
  const [form, setForm] = useState(() => (isEdit ? mapApiToForm(cheque) : emptyForm('incoming')));
  const [dirty, setDirty] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [ibanHint, setIbanHint] = useState('');
  const [cascadeNote, setCascadeNote] = useState('');
  const [balanceWarn, setBalanceWarn] = useState('');
  const [selectedBank, setSelectedBank] = useState(null);
  const [uploading, setUploading] = useState(false);
  const errorSummaryRef = useRef(null);

  const clients = useQuery({ queryKey: ['clients', 'cheque-form'], queryFn: () => listClients({ per_page: 200 }) });
  const projects = useQuery({
    queryKey: ['projects', 'cheque-form', form.client_id],
    queryFn: () => listProjects({ per_page: 200, client_id: form.client_id || undefined }),
    enabled: Boolean(form.client_id),
  });
  const invoices = useQuery({
    queryKey: ['invoices', 'cheque-form', form.client_id, form.project_id],
    queryFn: () =>
      listInvoices({
        per_page: 100,
        client_id: form.client_id || undefined,
        project_id: form.project_id || undefined,
      }),
    enabled: Boolean(form.client_id),
  });

  const templateOverride = useQuery({
    queryKey: ['cheque-template-override', form.bank_id],
    queryFn: () => fetchChequeTemplateOverride(form.bank_id),
    enabled: Boolean(form.bank_id),
  });

  const invoiceBalance = useQuery({
    queryKey: ['cheque-invoice-balance', form.invoice_id],
    queryFn: () => fetchChequeInvoiceBalance(form.invoice_id),
    enabled: Boolean(form.invoice_id),
  });

  useEffect(() => {
    if (!isEdit || !cheque) return;
    setForm(mapApiToForm(cheque));
    setDirty(false);
  }, [cheque, isEdit]);

  useEffect(() => {
    if (!dirty) return undefined;
    function onBeforeUnload(e) {
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    const bal = invoiceBalance.data?.data;
    if (!bal || !form.amount) {
      setBalanceWarn('');
      return;
    }
    const amount = Number(form.amount);
    const outstanding = Number(bal.outstanding ?? bal.balance ?? 0);
    if (amount > outstanding && outstanding >= 0) {
      setBalanceWarn(`مبلغ الشيك (${amount}) يتجاوز المتبقي على الفاتورة (${outstanding}).`);
    } else {
      setBalanceWarn('');
    }
  }, [form.amount, invoiceBalance.data]);

  const filteredProjects = useMemo(() => {
    const rows = projects.data?.data || [];
    if (!form.client_id) return rows;
    return rows.filter((p) => p.client_id === form.client_id || p.client?.id === form.client_id);
  }, [projects.data, form.client_id]);

  const previewRow = useMemo(
    () => ({
      direction: form.direction,
      amount: form.amount,
      currency: form.currency_code,
      payee: form.direction === 'outgoing' ? form.payee_name : undefined,
      client_name: clients.data?.data?.find((c) => c.id === form.client_id)?.name,
      bank_id: form.bank_id,
      bank_name: form.bank_name || selectedBank?.nameAr,
      number: form.number,
      issue_date: form.issue_date,
      due_date: form.due_date,
      issueDate: form.issue_date,
      dueDate: form.due_date,
      account_reference: form.account_reference,
      notes: form.notes,
    }),
    [form, clients.data, selectedBank],
  );

  const template = useMemo(() => {
    const bank = selectedBank || (form.bank_id ? { id: form.bank_id, nameAr: form.bank_name, verified: selectedBank?.verified } : null);
    const override = templateOverride.data?.data;
    const withScan = override?.scan_document_id
      ? { ...override, scan_url: `/api/v1/documents/${override.scan_document_id}/download?inline=true` }
      : override;
    return resolveChequeTemplate(bank || previewRow.bank, withScan);
  }, [selectedBank, form.bank_id, form.bank_name, previewRow, templateOverride.data]);

  const previewData = useMemo(() => mapChequeToPreviewData(previewRow), [previewRow]);

  const patch = useCallback((next) => {
    setDirty(true);
    setForm((prev) => ({ ...prev, ...next }));
  }, []);

  function validateLocal() {
    const errors = {};
    if (!form.number?.trim()) errors.number = 'رقم الشيك مطلوب';
    if (!form.amount?.trim()) errors.amount = 'المبلغ مطلوب';
    if (form.direction === 'incoming' && !form.client_id) errors.client_id = 'العميل مطلوب للشيكات الواردة';
    if (form.direction === 'outgoing' && !form.payee_name?.trim()) errors.payee_name = 'المستفيد مطلوب';
    if (form.issue_date && form.due_date && form.due_date < form.issue_date) {
      errors.due_date = 'تاريخ الاستحقاق يجب أن يكون في أو بعد تاريخ الإصدار';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        direction: form.direction,
        number: form.number.trim(),
        cheque_number: form.number.trim(),
        amount: form.amount.trim(),
        currency_code: form.currency_code,
        issue_date: form.issue_date || undefined,
        due_date: form.due_date || undefined,
        bank_id: form.bank_id || undefined,
        bank_name: form.bank_name || selectedBank?.nameAr || undefined,
        client_id: form.client_id || undefined,
        project_id: form.project_id || undefined,
        invoice_id: form.invoice_id || undefined,
        payee_name: form.direction === 'outgoing' ? form.payee_name.trim() : undefined,
        account_reference: form.account_reference || undefined,
        notes: form.notes || undefined,
        scan_document_id: form.scan_document_id || undefined,
      };
      if (isEdit) return updateCheque(cheque.id, body);
      return createCheque(body);
    },
    onSuccess: async (res) => {
      await invalidateFinance();
      setDirty(false);
      showToast(isEdit ? 'تم تحديث الشيك' : 'تم إنشاء الشيك', 'ok');
      const id = res?.data?.id;
      if (id) goToChequeDetail(id);
      onDone?.(res?.data);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        const mapped = fieldErrorsFromApi(error);
        if (Object.keys(mapped).length) {
          setFieldErrors(mapped);
          setSubmitError('يرجى تصحيح الحقول المحددة.');
          errorSummaryRef.current?.focus();
          return;
        }
      }
      setSubmitError(error.message || 'تعذر الحفظ');
    },
  });

  async function onUploadScan(file) {
    if (!form.project_id) {
      showToast('اختر مشروعًا قبل رفع صورة الشيك', 'error');
      return;
    }
    setUploading(true);
    try {
      await uploadProjectDocument(form.project_id, file);
      const list = await listDocuments({ project_id: form.project_id, per_page: 20 });
      const rows = list?.data || [];
      const match = rows.find((r) => r.name === file.name)
        || rows.sort((a, b) => (b.created_at || 0) - (a.created_at || 0))[0];
      if (match?.id) {
        await updateDocumentMeta(match.id, { custom_value1: 'cheque' });
        patch({ scan_document_id: match.id });
        showToast('تم إرفاق صورة الشيك', 'ok');
      }
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setUploading(false);
    }
  }

  function onIbanBlur() {
    const raw = form.iban;
    if (!raw?.trim()) {
      setIbanHint('');
      return;
    }
    const result = analyzePalestinianIban(raw);
    if (result.status === IBAN_STATUS.INVALID) {
      setIbanHint(result.reason);
      return;
    }
    if (result.status === IBAN_STATUS.VALID_UNMATCHED) {
      setIbanHint(result.reason);
      patch({ account_reference: normalizeIban(raw) });
      return;
    }
    if (result.status === IBAN_STATUS.VALID_MATCHED && result.bank) {
      setIbanHint('');
      setSelectedBank(result.bank);
      patch({
        bank_id: result.bank.id,
        bank_name: result.bank.nameAr,
        account_reference: normalizeIban(raw),
      });
    }
  }

  function onClientChange(clientId) {
    patch({ client_id: clientId, project_id: '', invoice_id: '' });
    setCascadeNote(clientId ? 'تم مسح المشروع والفاتورة لأن العميل تغيّر.' : '');
  }

  function onProjectChange(projectId) {
    patch({ project_id: projectId, invoice_id: '' });
    if (projectId) setCascadeNote('تم مسح الفاتورة لأن المشروع تغيّر.');
  }

  const readOnly = isEdit && isTerminal(cheque?.status);

  function onSubmit(e) {
    e.preventDefault();
    setSubmitError('');
    if (!validateLocal()) {
      errorSummaryRef.current?.focus();
      return;
    }
    saveMutation.mutate();
  }

  const bal = invoiceBalance.data?.data;

  return (
    <div className="cheque-workspace grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] min-w-0">
      <form className="space-y-4 min-w-0" onSubmit={onSubmit} noValidate>
        <Field label="اتجاه الشيك">
          <Segmented
            ariaLabel="اتجاه الشيك"
            value={form.direction}
            options={[
              { id: 'incoming', label: 'وارد' },
              { id: 'outgoing', label: 'صادر' },
            ]}
            onChange={(direction) => {
              patch(emptyForm(direction));
              setSelectedBank(null);
              setCascadeNote('');
            }}
          />
        </Field>

        {cascadeNote ? (
          <p className="text-sm rounded-lg px-3 py-2" style={{ background: C.tint, color: C.inkSoft }}>{cascadeNote}</p>
        ) : null}

        {form.direction === 'incoming' ? (
          <Field label="العميل" htmlFor="cheque-client">
            <ClientSelect
              clients={clients.data?.data}
              value={form.client_id}
              onChange={onClientChange}
            />
            {fieldErrors.client_id ? <FieldError id="err-client">{fieldErrors.client_id}</FieldError> : null}
          </Field>
        ) : (
          <Field label="المستفيد" htmlFor="cheque-payee">
            <TextInput
              id="cheque-payee"
              value={form.payee_name}
              onChange={(e) => patch({ payee_name: e.target.value })}
              onBlur={() => validateLocal()}
              aria-describedby={fieldErrors.payee_name ? 'err-payee' : undefined}
              disabled={readOnly}
            />
            {fieldErrors.payee_name ? <FieldError id="err-payee">{fieldErrors.payee_name}</FieldError> : null}
          </Field>
        )}

        <Field label="المشروع">
          <ProjectSelect
            projects={filteredProjects}
            value={form.project_id}
            onChange={onProjectChange}
            placeholder={form.client_id ? 'اختر المشروع' : 'اختر العميل أولًا'}
          />
        </Field>

        {form.client_id ? (
          <Field label="الفاتورة">
            <select
              value={form.invoice_id}
              onChange={(e) => patch({ invoice_id: e.target.value })}
              className="w-full rounded-xl px-3 py-2.5 text-base min-h-11"
              style={{ background: C.paper, border: `1px solid ${C.border}` }}
              disabled={readOnly}
            >
              <option value="">بدون فاتورة</option>
              {(invoices.data?.data || []).map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.number} — {inv.balance}
                </option>
              ))}
            </select>
            {bal ? (
              <p className="text-sm mt-1 tabular-nums" style={{ color: C.inkSoft }} dir="ltr">
                قيمة الفاتورة: {bal.total ?? '—'} · المدفوع: {bal.paid ?? '—'} · المتبقي: {bal.outstanding ?? bal.balance ?? '—'}
              </p>
            ) : null}
            {balanceWarn ? (
              <p className="flex items-start gap-2 text-sm mt-2" style={{ color: C.burgundy }}>
                <AlertTriangle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
                {balanceWarn}
              </p>
            ) : null}
          </Field>
        ) : null}

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="المبلغ" htmlFor="cheque-amount">
            <TextInput
              id="cheque-amount"
              inputMode="decimal"
              className="tabular-nums"
              value={form.amount}
              onChange={(e) => patch({ amount: e.target.value })}
              onBlur={(e) => patch({ amount: e.target.value.replace(/,/g, '').trim() })}
              aria-describedby={fieldErrors.amount ? 'err-amount' : undefined}
              disabled={readOnly}
            />
            {fieldErrors.amount ? <FieldError id="err-amount">{fieldErrors.amount}</FieldError> : null}
          </Field>
          <Field label="العملة" htmlFor="cheque-currency">
            <select
              id="cheque-currency"
              value={form.currency_code}
              onChange={(e) => patch({ currency_code: e.target.value })}
              className="w-full rounded-xl px-3 py-2.5 min-h-11"
              style={{ background: C.paper, border: `1px solid ${C.border}` }}
              disabled={readOnly}
            >
              {CURRENCY_OPTIONS.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="البنك">
          <ChequeBankSelect
            value={form.bank_id}
            onChange={(bank) => {
              setSelectedBank(bank);
              patch({ bank_id: bank.id, bank_name: bank.nameAr });
            }}
          />
        </Field>

        <Field label="IBAN (اختياري)" htmlFor="cheque-iban" hint="للتعرّف على البنك عند التحقق فقط">
          <TextInput
            id="cheque-iban"
            dir="ltr"
            className="tabular-nums"
            value={form.iban}
            onChange={(e) => patch({ iban: e.target.value })}
            onBlur={onIbanBlur}
            disabled={readOnly}
          />
          {ibanHint ? <FieldError>{ibanHint}</FieldError> : null}
        </Field>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="رقم الشيك" htmlFor="cheque-number">
            <TextInput
              id="cheque-number"
              value={form.number}
              onChange={(e) => patch({ number: e.target.value })}
              aria-describedby={fieldErrors.number ? 'err-number' : undefined}
              disabled={readOnly}
            />
            {fieldErrors.number ? <FieldError id="err-number">{fieldErrors.number}</FieldError> : null}
          </Field>
          <Field label="الحساب / المرجع" htmlFor="cheque-account">
            <TextInput
              id="cheque-account"
              value={form.account_reference}
              onChange={(e) => patch({ account_reference: e.target.value })}
              disabled={readOnly}
            />
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="تاريخ الإصدار" htmlFor="cheque-issue">
            <TextInput
              id="cheque-issue"
              type="date"
              value={form.issue_date}
              onChange={(e) => patch({ issue_date: e.target.value })}
              disabled={readOnly}
            />
          </Field>
          <Field label="تاريخ الاستحقاق" htmlFor="cheque-due">
            <TextInput
              id="cheque-due"
              type="date"
              value={form.due_date}
              onChange={(e) => patch({ due_date: e.target.value })}
              onBlur={() => validateLocal()}
              aria-describedby={fieldErrors.due_date ? 'err-due' : undefined}
              disabled={readOnly}
            />
            {fieldErrors.due_date ? <FieldError id="err-due">{fieldErrors.due_date}</FieldError> : null}
          </Field>
        </div>

        <Field label="ملاحظات" htmlFor="cheque-notes">
          <TextArea id="cheque-notes" value={form.notes} onChange={(e) => patch({ notes: e.target.value })} disabled={readOnly} />
        </Field>

        {form.direction === 'incoming' ? (
          <Field label="إرفاق صورة الشيك">
            <input
              type="file"
              accept="image/*,application/pdf"
              className="min-h-11"
              disabled={readOnly || uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUploadScan(file);
              }}
            />
            {form.scan_document_id ? (
              <p className="text-sm" style={{ color: C.emerald }}>تم ربط مرفق بالشيك</p>
            ) : null}
          </Field>
        ) : null}

        {submitError ? (
          <div
            ref={errorSummaryRef}
            tabIndex={-1}
            className="rounded-lg px-3 py-2 text-sm outline-none focus-visible:ring-2"
            style={{ background: C.burgundySoft, color: C.burgundy }}
            role="alert"
          >
            {submitError}
            {Object.keys(fieldErrors).length ? (
              <ul className="mt-2 list-disc ps-5">
                {Object.entries(fieldErrors).map(([key, msg]) => (
                  <li key={key}>
                    <a href={`#cheque-${key.replace('_', '-')}`} className="underline">{msg}</a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <div className="cheque-form-actions flex flex-wrap gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <GhostButton type="button" className="min-h-11 min-w-11" onClick={onCancel}>
            إلغاء
          </GhostButton>
          {!readOnly ? (
            <PrimaryButton type="submit" loading={saveMutation.isPending} className="min-h-11">
              {isEdit ? 'حفظ التعديلات' : 'إنشاء الشيك'}
            </PrimaryButton>
          ) : null}
        </div>
      </form>

      <aside className="cheque-workspace-preview lg:sticky lg:top-4 self-start min-w-0">
        <ChequePreviewPanel direction={form.direction} data={previewData} template={template} />
      </aside>
    </div>
  );
}

function FieldError({ id, children }) {
  return (
    <p id={id} className="text-sm mt-1" style={{ color: C.burgundy }} role="alert">
      {children}
    </p>
  );
}
