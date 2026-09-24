import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  LayoutGrid,
  List,
  Package,
  Plus,
  Search,
} from 'lucide-react';
import { createProject, listProjects } from '../lib/api/projects';
import { createClient, listClients } from '../lib/api/clients';
import { invalidateFinance, keys } from '../lib/query';
import { C, FONT_HEAD, MONTHS, RADIUS, YEARS, money } from '../theme';
import { canUser } from '../lib/permissions';
import { useAuth } from '../lib/auth/AuthProvider';
import { Sheet } from '../components/ui/Sheet';
import { ClientSelect } from '../components/ui/ResourcePage';
import { ErrorState, GhostButton, LoadingBlock, PrimaryButton } from '../components/ui/Actions';
import { TextInput } from '../components/settings/Fields';
import { showToast } from '../lib/toast';
import { todayIso } from '../lib/labels';
import {
  PROJECT_SORT_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  collectProjectTypes,
  filterAndSortProjects,
} from '../lib/projects/projectFilters';

const ICON = 1.5;

function FilterField({ label, children }) {
  return (
    <label className="os-projects-field">
      <span className="os-projects-field__label">{label}</span>
      {children}
    </label>
  );
}

function selectClassName() {
  return 'os-projects-select';
}

export function Projects({ hidden, onOpenProject }) {
  const { session } = useAuth();
  const [search, setSearch] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState('all');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [clientId, setClientId] = useState('');
  const [sort, setSort] = useState('newest');
  const [view, setView] = useState('rows');

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [clientMode, setClientMode] = useState('new');
  const [newClientId, setNewClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [due, setDue] = useState('');

  const query = useQuery({
    queryKey: keys.projects('all-list'),
    queryFn: () => listProjects({ per_page: 200, include: 'client' }),
  });
  const clients = useQuery({ queryKey: keys.clients(), queryFn: () => listClients({ per_page: 200 }) });

  const allRows = query.data?.data || [];
  const typeOptions = useMemo(() => collectProjectTypes(allRows), [allRows]);

  const filtered = useMemo(
    () =>
      filterAndSortProjects(allRows, {
        year,
        month,
        type,
        status,
        clientId,
        search,
        sort,
      }),
    [allRows, year, month, type, status, clientId, search, sort],
  );

  const canCreate = canUser(session?.user, 'create_project');
  const canSave = name && (clientMode === 'new' ? clientName.trim() : newClientId);

  const mutation = useMutation({
    mutationFn: async () => {
      let resolvedClientId = newClientId;
      if (clientMode === 'new') {
        const created = await createClient({
          name: clientName.trim(),
          contacts: [{ first_name: clientName.trim(), email: clientEmail.trim(), phone: clientPhone.trim(), send_email: false }],
        });
        resolvedClientId = created.data.id;
      }
      if (!resolvedClientId) {
        throw new Error('اختر العميل أو أدخل بيانات عميل جديد');
      }
      return createProject({
        name,
        client_id: resolvedClientId,
        budgeted_amount: Number(amount) || 0,
        due_date: due || undefined,
      });
    },
    onSuccess: async () => {
      await invalidateFinance();
      setOpen(false);
      setName('');
      setClientMode('new');
      setNewClientId('');
      setClientName('');
      setClientPhone('');
      setClientEmail('');
      setAmount('');
      setDue('');
      showToast(clientMode === 'new' ? 'تم حفظ المشروع والعميل' : 'تم حفظ المشروع', 'ok');
    },
    onError: (error) => showToast(error.message, 'error'),
  });

  const clientOptions = clients.data?.data || [];
  const total = allRows.length;
  const shown = filtered.length;

  return (
    <div className="os-projects min-w-0">
      <header className="os-projects-header">
        <div className="os-projects-header__copy">
          <h2 className="os-projects-header__title" style={{ fontFamily: FONT_HEAD }}>
            المشاريع
          </h2>
          <p className="os-projects-header__sub">الربحية والميزانية لكل مشروع</p>
        </div>
        {canCreate ? (
          <PrimaryButton type="button" onClick={() => setOpen(true)} className="os-projects-header__cta">
            <Plus size={18} strokeWidth={ICON} aria-hidden="true" />
            مشروع جديد
          </PrimaryButton>
        ) : null}
      </header>

      <div className="os-projects-panel os-projects-filters">
        <FilterField label="السنة">
          <select className={selectClassName()} value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="all">كل السنوات</option>
            {YEARS.map((y) => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
        </FilterField>
        <FilterField label="الشهر">
          <select className={selectClassName()} value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="all">كل الشهور</option>
            {MONTHS.map((label, index) => (
              <option key={label} value={String(index + 1)}>{label}</option>
            ))}
          </select>
        </FilterField>
        <FilterField label="نوع المشروع">
          <select className={selectClassName()} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">كل الأنواع</option>
            <option value="none">بدون نوع</option>
            {typeOptions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </FilterField>
        <FilterField label="حالة المشروع">
          <select className={selectClassName()} value={status} onChange={(e) => setStatus(e.target.value)}>
            {PROJECT_STATUS_OPTIONS.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </FilterField>
        <FilterField label="العميل">
          <select className={selectClassName()} value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">كل العملاء</option>
            {clientOptions.map((client) => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
        </FilterField>
        <FilterField label="الترتيب">
          <select className={selectClassName()} value={sort} onChange={(e) => setSort(e.target.value)}>
            {PROJECT_SORT_OPTIONS.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </FilterField>
        <div className="os-projects-view-toggle" role="group" aria-label="طريقة العرض">
          <button
            type="button"
            className={view === 'rows' ? 'is-active' : ''}
            onClick={() => setView('rows')}
          >
            <List size={16} strokeWidth={ICON} aria-hidden="true" />
            صفوف
          </button>
          <button
            type="button"
            className={view === 'cards' ? 'is-active' : ''}
            onClick={() => setView('cards')}
          >
            <LayoutGrid size={16} strokeWidth={ICON} aria-hidden="true" />
            بطاقات
          </button>
        </div>
      </div>

      <div className="os-projects-panel os-projects-toolbar">
        <div className="os-projects-toolbar__title">
          <span className="os-projects-toolbar__dot" aria-hidden="true" />
          <div>
            <strong>المشاريع</strong>
            <span className="os-projects-toolbar__count">
              عرض {shown} من {total} مشروع
            </span>
          </div>
        </div>
        <label className="os-projects-search">
          <Search size={18} strokeWidth={ICON} aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم المشروع، العميل، النوع…"
            aria-label="بحث في المشاريع"
          />
        </label>
        <span className="os-projects-badge os-num" aria-label={`${shown} من ${total}`}>
          {shown}/{total}
        </span>
      </div>

      <div className="os-projects-panel os-projects-body">
        {query.isLoading ? <LoadingBlock /> : null}
        {query.isError ? (
          <ErrorState error={query.error} message={query.error?.message} onRetry={() => query.refetch()} />
        ) : null}

        {!query.isLoading && !query.isError && filtered.length === 0 ? (
          <div className="os-projects-empty">
            <span className="os-projects-empty__icon" aria-hidden="true">
              <Package size={32} strokeWidth={1.25} />
            </span>
            <p className="os-projects-empty__title">ابدأ بإضافة مشاريعك</p>
            <p className="os-projects-empty__body">
              كل مشروع يجمع دخله ومصاريفه ويحسب ربحه لحاله
            </p>
            {canCreate ? (
              <PrimaryButton type="button" onClick={() => setOpen(true)} className="mt-4">
                <Plus size={16} strokeWidth={ICON} aria-hidden="true" />
                مشروع جديد
              </PrimaryButton>
            ) : null}
          </div>
        ) : null}

        {!query.isLoading && !query.isError && filtered.length > 0 && view === 'rows' ? (
          <div className="os-projects-rows" role="list">
            <div className="os-projects-row os-projects-row--head" aria-hidden="true">
              <span>المشروع</span>
              <span>العميل</span>
              <span>النوع</span>
              <span>الميزانية</span>
              <span>الاستحقاق</span>
            </div>
            {filtered.map((row) => (
              <button
                key={row.id}
                type="button"
                role="listitem"
                className="os-projects-row"
                onClick={() => onOpenProject?.(row.id)}
              >
                <span className="os-projects-row__name">{row.name || '—'}</span>
                <span>{row.client?.name || '—'}</span>
                <span className="os-projects-row__muted">{row.custom_value1 || '—'}</span>
                <span className="os-num">{money(row.budgeted_amount || 0, hidden)}</span>
                <span className="os-projects-row__muted">{row.due_date || '—'}</span>
              </button>
            ))}
          </div>
        ) : null}

        {!query.isLoading && !query.isError && filtered.length > 0 && view === 'cards' ? (
          <div className="os-projects-cards">
            {filtered.map((row) => (
              <button
                key={row.id}
                type="button"
                className="os-projects-card"
                onClick={() => onOpenProject?.(row.id)}
              >
                <div className="os-projects-card__head">
                  <strong>{row.name || '—'}</strong>
                  {row.custom_value1 ? <span className="os-projects-card__tag">{row.custom_value1}</span> : null}
                </div>
                <p className="os-projects-card__client">{row.client?.name || '—'}</p>
                <div className="os-projects-card__meta">
                  <span>
                    <em>الميزانية</em>
                    <strong className="os-num">{money(row.budgeted_amount || 0, hidden)}</strong>
                  </span>
                  <span>
                    <em>الاستحقاق</em>
                    <strong>{row.due_date || '—'}</strong>
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <Sheet open={open} title="إضافة مشروع" onClose={() => setOpen(false)}>
        <Field label="اسم المشروع">
          <TextInput value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="العميل">
          <div className="flex flex-wrap gap-2 mb-2">
            <GhostButton type="button" onClick={() => setClientMode('new')} className={clientMode === 'new' ? 'opacity-100' : 'opacity-60'}>
              عميل جديد
            </GhostButton>
            <GhostButton type="button" onClick={() => setClientMode('existing')} className={clientMode === 'existing' ? 'opacity-100' : 'opacity-60'}>
              عميل موجود
            </GhostButton>
          </div>
          {clientMode === 'new' ? (
            <div className="space-y-3">
              <TextInput value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="اسم العميل" />
              <TextInput value={clientPhone} onChange={(event) => setClientPhone(event.target.value)} placeholder="هاتف العميل" />
              <TextInput value={clientEmail} onChange={(event) => setClientEmail(event.target.value)} placeholder="بريد العميل" />
            </div>
          ) : (
            <ClientSelect clients={clients.data?.data} value={newClientId} onChange={setNewClientId} />
          )}
        </Field>
        <Field label="قيمة المشروع">
          <TextInput value={amount} onChange={(event) => setAmount(event.target.value)} className="tabular-nums" />
        </Field>
        <Field label="تاريخ الاستحقاق">
          <TextInput type="date" value={due} onChange={(event) => setDue(event.target.value)} />
        </Field>
        <PrimaryButton disabled={!canSave || mutation.isPending} loading={mutation.isPending} onClick={() => mutation.mutate()}>
          {clientMode === 'new' ? 'حفظ المشروع والعميل' : 'حفظ المشروع'}
        </PrimaryButton>
        <p className="text-base" style={{ color: C.inkFaint }}>التاريخ الافتراضي إن لم يُحدد: {todayIso()}</p>
      </Sheet>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-base mb-1.5" style={{ color: C.inkSoft }}>{label}</span>
      {children}
    </label>
  );
}
