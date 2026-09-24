import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  ChevronDown,
  CircleDollarSign,
  FileText,
  FolderKanban,
  LogOut,
  Menu,
  ScrollText,
  Search,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../lib/auth/AuthProvider';
import { listClients } from '../lib/api/clients';
import { listInvoices } from '../lib/api/invoices';
import { fetchOverview } from '../lib/api/office';
import { listProjects } from '../lib/api/projects';
import { flattenNavItems } from '../lib/navigation';
import { keys } from '../lib/query';
import { C, FONT_HEAD, FONT_SERIF, RADIUS, money } from '../theme';

const ICON = 1.65;

function useDebounced(value, delay = 280) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function usePhoneChrome(desktop) {
  const [phone, setPhone] = useState(() => {
    if (desktop || typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });

  useEffect(() => {
    if (desktop) {
      setPhone(false);
      return undefined;
    }
    const media = window.matchMedia('(max-width: 767px)');
    const sync = () => setPhone(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [desktop]);

  return phone;
}

function alertHref(alert) {
  if (alert?.entity_type === 'invoice') return 'invoices';
  if (alert?.entity_type === 'cheque') return 'checks';
  return 'dashboard';
}

export function TopBar({
  page,
  year,
  setYear,
  hidden,
  pageMeta,
  years,
  menuOpen = false,
  onToggleMenu,
  desktop = false,
  onNavigate,
  navGroups = [],
}) {
  const { logout } = useAuth();
  const phone = usePhoneChrome(desktop);
  const meta = pageMeta[page] || { title: page };

  const [yearOpen, setYearOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const yearRef = useRef(null);
  const bellRef = useRef(null);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);

  const debounced = useDebounced(query.trim());
  const canFetch = debounced.length >= 2 && searchOpen;

  const overview = useQuery({
    queryKey: keys.overview,
    queryFn: fetchOverview,
    refetchInterval: (query) => (query.state.status === 'error' ? false : 12_000),
  });
  const alerts = overview.data?.alerts || [];

  const pages = useMemo(() => flattenNavItems(navGroups), [navGroups]);
  const pageHits = useMemo(() => {
    const needle = query.trim();
    if (!needle) return pages.slice(0, 6);
    return pages.filter((item) => item.label.includes(needle) || item.id.includes(needle.toLowerCase())).slice(0, 6);
  }, [pages, query]);

  const projects = useQuery({
    queryKey: keys.projects(debounced),
    queryFn: () => listProjects({ filter: debounced, per_page: 5 }),
    enabled: canFetch,
  });
  const clients = useQuery({
    queryKey: keys.clients(debounced),
    queryFn: () => listClients({ filter: debounced, per_page: 5 }),
    enabled: canFetch,
  });
  const invoices = useQuery({
    queryKey: keys.invoices(debounced),
    queryFn: () => listInvoices({ filter: debounced, per_page: 5 }),
    enabled: canFetch,
  });

  const projectHits = canFetch ? (projects.data?.data || []).slice(0, 4) : [];
  const clientHits = canFetch ? (clients.data?.data || []).slice(0, 4) : [];
  const invoiceHits = canFetch ? (invoices.data?.data || []).slice(0, 4) : [];
  const hasRemote = projectHits.length + clientHits.length + invoiceHits.length > 0;
  const searching = canFetch && (projects.isFetching || clients.isFetching || invoices.isFetching);

  function closeMenus() {
    setYearOpen(false);
    setBellOpen(false);
    setSearchOpen(false);
  }

  function go(id) {
    onNavigate?.(id);
    setQuery('');
    closeMenus();
  }

  useEffect(() => {
    function onPointerDown(event) {
      const target = event.target;
      if (yearRef.current && !yearRef.current.contains(target)) setYearOpen(false);
      if (bellRef.current && !bellRef.current.contains(target)) setBellOpen(false);
      if (searchRef.current && !searchRef.current.contains(target)) setSearchOpen(false);
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') closeMenus();
      if (phone) return;
      const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
        requestAnimationFrame(() => searchInputRef.current?.focus());
      }
      if (!typing && event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        setSearchOpen(true);
        requestAnimationFrame(() => searchInputRef.current?.focus());
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [phone]);

  if (phone) {
    return (
      <PhoneTopBar
        meta={meta}
        year={year}
        setYear={setYear}
        hidden={hidden}
        years={years}
        menuOpen={menuOpen}
        onToggleMenu={onToggleMenu}
        yearOpen={yearOpen}
        setYearOpen={setYearOpen}
        yearRef={yearRef}
        bellOpen={bellOpen}
        setBellOpen={setBellOpen}
        bellRef={bellRef}
        alerts={alerts}
        onAlertGo={(alert) => go(alertHref(alert))}
        onLogout={() => logout()}
      />
    );
  }

  const resultsOpen = searchOpen && (query.trim() || pageHits.length);

  return (
    <header className="print-hide os-topbar">
      <div className="os-topbar-inner">
        <div className="os-topbar-lead">
          <h1 className="os-topbar-title truncate">{meta.title}</h1>
          {meta.subtitle ? <p className="os-topbar-sub truncate">{meta.subtitle}</p> : null}
        </div>

        <div className="os-topbar-search no-drag" ref={searchRef}>
          <label className="os-topbar-search__field">
            <Search size={16} strokeWidth={ICON} className="os-topbar-search__icon" aria-hidden="true" />
            <input
              ref={searchInputRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder="ابحث عن مشروع، عميل، أو فاتورة…"
              aria-label="بحث"
              aria-expanded={resultsOpen}
              aria-controls="os-topbar-results"
            />
            <kbd className="os-topbar-search__kbd" aria-hidden="true">Ctrl K</kbd>
          </label>

          {resultsOpen ? (
            <SearchResults
              query={query}
              pageHits={pageHits}
              projectHits={projectHits}
              clientHits={clientHits}
              invoiceHits={invoiceHits}
              hasRemote={hasRemote}
              searching={searching}
              onGo={go}
            />
          ) : null}
        </div>

        <div className="os-topbar-actions no-drag">
          <div className="os-topbar-year-wrap" ref={yearRef}>
            <button
              type="button"
              className="os-topbar-year"
              onClick={() => { setBellOpen(false); setYearOpen((open) => !open); }}
              aria-expanded={yearOpen}
              aria-haspopup="listbox"
              aria-label="السنة المالية"
            >
              <span className="os-num">{year}</span>
              <ChevronDown size={14} strokeWidth={ICON} aria-hidden="true" className={yearOpen ? 'is-open' : ''} />
            </button>
            {yearOpen ? (
              <div className="os-topbar-menu" role="listbox" aria-label="اختر السنة">
                {years.map((item) => (
                  <button
                    key={item}
                    type="button"
                    role="option"
                    aria-selected={item === year}
                    className={`os-num ${item === year ? 'is-active' : ''}`}
                    onClick={() => { setYear(item); setYearOpen(false); }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="relative" ref={bellRef}>
            <button
              type="button"
              className={`os-topbar-icon ${bellOpen ? 'is-on' : ''}`}
              onClick={() => { setYearOpen(false); setBellOpen((open) => !open); }}
              aria-label="التنبيهات"
              aria-expanded={bellOpen}
              aria-haspopup="true"
            >
              <Bell size={17} strokeWidth={ICON} aria-hidden="true" />
              {alerts.length ? <span className="os-topbar-dot" aria-hidden="true" /> : null}
            </button>
            {bellOpen ? (
              <div className="os-topbar-panel" role="menu" aria-label="التنبيهات">
                <div className="os-topbar-panel__head">التنبيهات</div>
                {alerts.length === 0 ? (
                  <p className="os-topbar-panel__empty">لا تنبيهات تحتاج متابعة الآن.</p>
                ) : (
                  alerts.slice(0, 6).map((alert) => (
                    <button
                      key={alert.id}
                      type="button"
                      className="os-topbar-alert"
                      onClick={() => go(alertHref(alert))}
                    >
                      <span className="os-topbar-alert__title">{alert.title}</span>
                      <span className="os-topbar-alert__body">{alert.body}</span>
                      {typeof alert.amount === 'number' ? (
                        <span className="os-topbar-alert__amount os-num">{money(alert.amount, hidden)}</span>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            className="os-topbar-icon os-topbar-logout"
            onClick={() => logout()}
            aria-label="تسجيل الخروج"
            title="تسجيل الخروج"
          >
            <LogOut size={17} strokeWidth={ICON} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}

function PhoneTopBar({
  meta,
  year,
  setYear,
  hidden,
  years,
  menuOpen,
  onToggleMenu,
  yearOpen,
  setYearOpen,
  yearRef,
  bellOpen,
  setBellOpen,
  bellRef,
  alerts,
  onAlertGo,
  onLogout,
}) {
  return (
    <header className="print-hide app-topbar app-topbar--mobile" dir="ltr">
      <div className="app-topbar__lead">
        <button
          type="button"
          className={`os-icon-btn no-drag app-topbar-menu ${menuOpen ? 'is-active' : ''}`}
          onClick={onToggleMenu}
          aria-label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
          aria-expanded={menuOpen}
          aria-controls="app-sidebar"
        >
          {menuOpen ? <X size={19} strokeWidth={2} aria-hidden="true" /> : <Menu size={19} strokeWidth={2} aria-hidden="true" />}
        </button>
      </div>

      <div className="app-topbar__center" dir="rtl">
        <h1 className="app-page-title truncate" style={{ color: C.ink, fontFamily: FONT_HEAD }}>
          {meta.title}
        </h1>
        {meta.subtitle ? (
          <p className="app-topbar-sub truncate" style={{ color: C.inkSoft }}>{meta.subtitle}</p>
        ) : null}
      </div>

      <div className="app-topbar__trail">
        <div className="app-topbar-controls no-drag flex flex-nowrap items-center shrink-0 app-topbar-controls--compact">
          <div className="relative" ref={yearRef}>
            <button
              type="button"
              onClick={() => setYearOpen((open) => !open)}
              aria-expanded={yearOpen}
              aria-haspopup="listbox"
              className="os-year-pill flex items-center gap-2 px-3 py-2 text-base min-h-11"
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                color: C.ink,
                borderRadius: RADIUS.md,
                fontFamily: FONT_SERIF,
              }}
            >
              <span className="tabular-nums">{year}</span>
              <ChevronDown size={13} strokeWidth={2} aria-hidden="true" style={{ transform: yearOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
            </button>
            {yearOpen ? (
              <div
                role="listbox"
                className="absolute end-0 mt-1 overflow-hidden z-20"
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  minWidth: 110,
                  borderRadius: RADIUS.md,
                }}
              >
                {years.map((item) => (
                  <button
                    key={item}
                    type="button"
                    role="option"
                    aria-selected={item === year}
                    onClick={() => { setYear(item); setYearOpen(false); }}
                    className="w-full text-start px-4 py-2 text-sm tabular-nums min-h-11"
                    style={{ background: item === year ? C.tint : 'transparent', color: C.ink }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="relative" ref={bellRef}>
            <button
              type="button"
              className={`os-icon-btn os-topbar-icon ${bellOpen ? 'is-on' : ''}`}
              onClick={() => { setYearOpen(false); setBellOpen((open) => !open); }}
              aria-label="التنبيهات"
              aria-expanded={bellOpen}
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: RADIUS.md,
              }}
            >
              <Bell size={17} strokeWidth={1.8} aria-hidden="true" />
            </button>
            {bellOpen ? (
              <div
                className="os-topbar-panel absolute end-0 mt-1 z-20"
                role="menu"
                aria-label="التنبيهات"
                style={{ minWidth: 260 }}
              >
                <div className="os-topbar-panel__head">التنبيهات</div>
                {alerts.length === 0 ? (
                  <p className="os-topbar-panel__empty">لا تنبيهات تحتاج متابعة الآن.</p>
                ) : (
                  alerts.slice(0, 6).map((alert) => (
                    <button
                      key={alert.id}
                      type="button"
                      className="os-topbar-alert"
                      onClick={() => onAlertGo(alert)}
                    >
                      <span className="os-topbar-alert__title">{alert.title}</span>
                      <span className="os-topbar-alert__body">{alert.body}</span>
                      {typeof alert.amount === 'number' ? (
                        <span className="os-topbar-alert__amount os-num">{money(alert.amount, hidden)}</span>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onLogout}
            aria-label="تسجيل الخروج"
            className="os-icon-btn flex items-center justify-center min-h-11 min-w-11"
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: RADIUS.md,
              color: C.ink,
            }}
          >
            <LogOut size={17} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}

function SearchResults({
  query,
  pageHits,
  projectHits,
  clientHits,
  invoiceHits,
  hasRemote,
  searching,
  onGo,
}) {
  const empty = query.trim().length >= 2 && !searching && !hasRemote && pageHits.length === 0;

  return (
    <div id="os-topbar-results" className="os-topbar-results" role="listbox" aria-label="نتائج البحث">
      {pageHits.length ? (
        <ResultGroup title="الصفحات">
          {pageHits.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} type="button" className="os-topbar-hit" onClick={() => onGo(item.id)}>
                <Icon size={16} strokeWidth={ICON} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </ResultGroup>
      ) : null}

      {projectHits.length ? (
        <ResultGroup title="المشاريع">
          {projectHits.map((row) => (
            <button key={row.id} type="button" className="os-topbar-hit" onClick={() => onGo('projects')}>
              <FolderKanban size={16} strokeWidth={ICON} aria-hidden="true" />
              <span>
                <strong>{row.name}</strong>
                <em>{row.client?.name || 'مشروع'}</em>
              </span>
            </button>
          ))}
        </ResultGroup>
      ) : null}

      {clientHits.length ? (
        <ResultGroup title="العملاء">
          {clientHits.map((row) => (
            <button key={row.id} type="button" className="os-topbar-hit" onClick={() => onGo('clients')}>
              <Users size={16} strokeWidth={ICON} aria-hidden="true" />
              <span>{row.name}</span>
            </button>
          ))}
        </ResultGroup>
      ) : null}

      {invoiceHits.length ? (
        <ResultGroup title="الفواتير">
          {invoiceHits.map((row) => (
            <button key={row.id} type="button" className="os-topbar-hit" onClick={() => onGo('invoices')}>
              <FileText size={16} strokeWidth={ICON} aria-hidden="true" />
              <span>
                <strong className="os-num">{row.number}</strong>
                <em>{row.client?.name || 'فاتورة'}</em>
              </span>
            </button>
          ))}
        </ResultGroup>
      ) : null}

      {query.trim().length >= 2 && searching && !hasRemote ? (
        <p className="os-topbar-panel__empty">جارِ البحث…</p>
      ) : null}

      {empty ? (
        <p className="os-topbar-panel__empty">لا نتائج مطابقة.</p>
      ) : null}

      {!query.trim() ? (
        <div className="os-topbar-hints">
          <span><FolderKanban size={13} strokeWidth={ICON} aria-hidden="true" /> مشروع</span>
          <span><Users size={13} strokeWidth={ICON} aria-hidden="true" /> عميل</span>
          <span><CircleDollarSign size={13} strokeWidth={ICON} aria-hidden="true" /> فاتورة</span>
          <span><ScrollText size={13} strokeWidth={ICON} aria-hidden="true" /> شيك</span>
        </div>
      ) : null}
    </div>
  );
}

function ResultGroup({ title, children }) {
  return (
    <div className="os-topbar-group">
      <div className="os-topbar-group__title">{title}</div>
      {children}
    </div>
  );
}
