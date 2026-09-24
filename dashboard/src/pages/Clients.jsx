import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  LayoutGrid,
  List,
  Mail,
  Package,
  Phone,
  Plus,
  Search,
} from 'lucide-react';
import { createClient, listClients } from '../lib/api/clients';
import { listProjects } from '../lib/api/projects';
import { invalidateFinance, keys } from '../lib/query';
import { C, FONT_HEAD, MONTHS, YEARS, money } from '../theme';
import { canUser } from '../lib/permissions';
import { primaryContact } from '../lib/labels';
import { useAuth } from '../lib/auth/AuthProvider';
import { Sheet } from '../components/ui/Sheet';
import { ErrorState, GhostButton, LoadingBlock, PrimaryButton } from '../components/ui/Actions';
import { TextInput } from '../components/settings/Fields';
import { showToast } from '../lib/toast';
import { openEmail, openWhatsApp } from '../lib/files';
import {
  CLIENT_SORT_OPTIONS,
  buildProjectCountByClient,
  enrichClientsWithProjects,
  filterAndSortClients,
} from '../lib/clients/clientFilters';

const ICON = 1.5;

function FilterField({ label, children }) {
  return (
    <label className="os-projects-field">
      <span className="os-projects-field__label">{label}</span>
      {children}
    </label>
  );
}

export function Clients({ hidden, onNavigate }) {
  const { session } = useAuth();
  const [search, setSearch] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState('all');
  const [sort, setSort] = useState('projects');
  const [view, setView] = useState('rows');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const query = useQuery({
    queryKey: keys.clients('all-list'),
    queryFn: () => listClients({ per_page: 200 }),
  });
  const projectsQuery = useQuery({
    queryKey: keys.projects('client-counts'),
    queryFn: () => listProjects({ per_page: 300 }),
  });

  const projectCountMap = useMemo(
    () => buildProjectCountByClient(projectsQuery.data?.data || []),
    [projectsQuery.data],
  );

  const allRows = useMemo(
    () => enrichClientsWithProjects(query.data?.data || [], projectCountMap),
    [query.data, projectCountMap],
  );

  const filtered = useMemo(
    () => filterAndSortClients(allRows, { year, month, search, sort }),
    [allRows, year, month, search, sort],
  );

  const canCreate = canUser(session?.user, 'create_client');
  const total = allRows.length;
  const shown = filtered.length;
  const loading = query.isLoading || projectsQuery.isLoading;

  const mutation = useMutation({
    mutationFn: () =>
      createClient({
        name,
        contacts: [{ first_name: name, email, phone, send_email: false }],
      }),
    onSuccess: async () => {
      await invalidateFinance();
      setOpen(false);
      setName('');
      setPhone('');
      setEmail('');
      showToast('تم حفظ العميل', 'ok');
    },
    onError: (error) => showToast(error.message, 'error'),
  });

  return (
    <div className="os-projects min-w-0">
      <header className="os-projects-header">
        <div className="os-projects-header__copy">
          <h2 className="os-projects-header__title" style={{ fontFamily: FONT_HEAD }}>
            العملاء
          </h2>
          <p className="os-projects-header__sub">كل عميل وكم مشروع أعطاك</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          {onNavigate ? (
            <PrimaryButton type="button" onClick={() => onNavigate('projects')} className="os-projects-header__cta">
              <Plus size={18} strokeWidth={ICON} aria-hidden="true" />
              مشروع جديد
            </PrimaryButton>
          ) : null}
          {canCreate ? (
            <GhostButton type="button" onClick={() => setOpen(true)}>
              <Plus size={16} strokeWidth={ICON} aria-hidden="true" />
              عميل جديد
            </GhostButton>
          ) : null}
        </div>
      </header>

      <div className="os-projects-panel os-projects-filters os-projects-filters--clients">
        <FilterField label="السنة">
          <select className="os-projects-select" value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="all">كل السنوات</option>
            {YEARS.map((y) => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
        </FilterField>
        <FilterField label="الشهر">
          <select className="os-projects-select" value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="all">كل الشهور</option>
            {MONTHS.map((label, index) => (
              <option key={label} value={String(index + 1)}>{label}</option>
            ))}
          </select>
        </FilterField>
        <FilterField label="الترتيب">
          <select className="os-projects-select" value={sort} onChange={(e) => setSort(e.target.value)}>
            {CLIENT_SORT_OPTIONS.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </FilterField>
        <div className="os-projects-view-toggle" role="group" aria-label="طريقة العرض">
          <button type="button" className={view === 'rows' ? 'is-active' : ''} onClick={() => setView('rows')}>
            <List size={16} strokeWidth={ICON} aria-hidden="true" />
            صفوف
          </button>
          <button type="button" className={view === 'cards' ? 'is-active' : ''} onClick={() => setView('cards')}>
            <LayoutGrid size={16} strokeWidth={ICON} aria-hidden="true" />
            بطاقات
          </button>
        </div>
      </div>

      <div className="os-projects-panel os-projects-toolbar">
        <div className="os-projects-toolbar__title">
          <span className="os-projects-toolbar__dot" aria-hidden="true" />
          <div>
            <strong>العملاء</strong>
            <span className="os-projects-toolbar__count">
              عرض {shown} من {total} عميل
            </span>
          </div>
        </div>
        <label className="os-projects-search">
          <Search size={18} strokeWidth={ICON} aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم العميل، الهاتف، البريد…"
            aria-label="بحث في العملاء"
          />
        </label>
        <span className="os-projects-badge os-num" aria-label={`${shown} من ${total}`}>
          {shown}/{total}
        </span>
      </div>

      <div className="os-projects-panel os-projects-body">
        {loading ? <LoadingBlock /> : null}
        {query.isError ? (
          <ErrorState error={query.error} message={query.error?.message} onRetry={() => query.refetch()} />
        ) : null}

        {!loading && !query.isError && filtered.length === 0 ? (
          <div className="os-projects-empty">
            <span className="os-projects-empty__icon" aria-hidden="true">
              <Package size={32} strokeWidth={1.25} />
            </span>
            <p className="os-projects-empty__title">ما في عملاء بعد</p>
            <p className="os-projects-empty__body">
              أضف مشروع واكتب اسم العميل حتى يظهر هنا
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              {onNavigate ? (
                <PrimaryButton type="button" onClick={() => onNavigate('projects')}>
                  <Plus size={16} strokeWidth={ICON} aria-hidden="true" />
                  مشروع جديد
                </PrimaryButton>
              ) : null}
              {canCreate ? (
                <GhostButton type="button" onClick={() => setOpen(true)}>
                  عميل جديد
                </GhostButton>
              ) : null}
            </div>
          </div>
        ) : null}

        {!loading && !query.isError && filtered.length > 0 && view === 'rows' ? (
          <div className="os-projects-rows" role="list">
            <div className="os-projects-row os-projects-row--head os-projects-row--clients" aria-hidden="true">
              <span>العميل</span>
              <span>المشاريع</span>
              <span>الهاتف</span>
              <span>الرصيد</span>
              <span />
            </div>
            {filtered.map((row) => {
              const contact = primaryContact(row);
              const phone = contact?.phone || row.phone || '—';
              return (
                <div key={row.id} role="listitem" className="os-projects-row os-projects-row--clients">
                  <span className="os-projects-row__name">{row.name || '—'}</span>
                  <span className="os-num">{row.project_count || 0}</span>
                  <span className="os-projects-row__muted">{phone}</span>
                  <span className="os-num">{money(row.balance || 0, hidden)}</span>
                  <span className="os-clients-row-actions">
                    {contact?.phone ? (
                      <GhostButton type="button" onClick={() => openWhatsApp(contact.phone)} aria-label="واتساب">
                        <Phone size={14} strokeWidth={ICON} />
                      </GhostButton>
                    ) : null}
                    {contact?.email ? (
                      <GhostButton type="button" onClick={() => openEmail(contact.email)} aria-label="بريد">
                        <Mail size={14} strokeWidth={ICON} />
                      </GhostButton>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}

        {!loading && !query.isError && filtered.length > 0 && view === 'cards' ? (
          <div className="os-projects-cards">
            {filtered.map((row) => {
              const contact = primaryContact(row);
              return (
                <article key={row.id} className="os-projects-card os-clients-card">
                  <div className="os-projects-card__head">
                    <strong>{row.name || '—'}</strong>
                    <span className="os-projects-card__tag os-num">
                      {row.project_count || 0} مشروع
                    </span>
                  </div>
                  <p className="os-projects-card__client">
                    {contact?.phone || row.phone || '—'}
                    {contact?.email || row.email ? ` · ${contact?.email || row.email}` : ''}
                  </p>
                  <div className="os-projects-card__meta">
                    <span>
                      <em>الرصيد</em>
                      <strong className="os-num">{money(row.balance || 0, hidden)}</strong>
                    </span>
                    <span className="os-clients-card-actions">
                      {contact?.phone ? (
                        <GhostButton type="button" onClick={() => openWhatsApp(contact.phone)}>
                          <Phone size={14} strokeWidth={ICON} />
                          واتساب
                        </GhostButton>
                      ) : null}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </div>

      <Sheet open={open} title="إضافة عميل" onClose={() => setOpen(false)}>
        <label className="block">
          <span className="block text-base mb-1.5" style={{ color: C.inkSoft }}>اسم العميل</span>
          <TextInput value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="block">
          <span className="block text-base mb-1.5" style={{ color: C.inkSoft }}>الهاتف</span>
          <TextInput value={phone} onChange={(event) => setPhone(event.target.value)} />
        </label>
        <label className="block">
          <span className="block text-base mb-1.5" style={{ color: C.inkSoft }}>البريد</span>
          <TextInput value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <PrimaryButton disabled={!name || mutation.isPending} loading={mutation.isPending} onClick={() => mutation.mutate()}>
          حفظ العميل
        </PrimaryButton>
      </Sheet>
    </div>
  );
}
