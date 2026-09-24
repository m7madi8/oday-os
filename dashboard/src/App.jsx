import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { C, FONT_BODY, PAGE_META, YEARS, getPalette } from './theme';
import { NAV_GROUPS } from './lib/navigation';
import { BrandLogo } from './components/BrandLogo';
import { Sidebar, TopBar, DesktopTitleBar, BottomNav } from './components/Chrome';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { SessionPanel } from './pages/SessionPanel';
import { Invoices } from './pages/Invoices';
import { AiAssistant } from './pages/AiAssistant';
import { Projects } from './pages/Projects';
import { ProjectDetail } from './pages/ProjectDetail';
import { Clients } from './pages/Clients';
import { Documents } from './pages/Documents';
import { Payments } from './pages/Payments';
import { Cheques } from './pages/Cheques';
import { ChequePreviewPlayground } from './pages/ChequePreviewPlayground';
import { ChequeDesignGallery } from './pages/ChequeDesignGallery';
import { Expenses } from './pages/Expenses';
import { Payroll } from './pages/Payroll';
import { Reports } from './pages/Reports';
import { DeadDebts } from './pages/DeadDebts';
import { Login } from './pages/Login';
import { getItem, setItem } from './lib/storage';
import {
  DEFAULT_OFFICE_SETTINGS,
  applyOfficeAppearance,
  loadOfficeSettings,
  mergeOfficeSettings,
  saveOfficeSettings,
} from './lib/officeSettings';
import { useAuth } from './lib/auth/AuthProvider';
import { canOpenPage, displayName, filterNavGroups, PAGE_PERMISSIONS } from './lib/permissions';
import { isDesktop } from './lib/desktop';
import { OfflineBanner } from './components/ui/OfflineBanner';
import { ToastHost } from './components/ui/ToastHost';
import { UpdateListener } from './components/UpdateListener';

import { showToast } from './lib/toast';
import {
  getAppPath,
  navigateApp,
  pageIdFromPath,
  parseChequeRoute,
  subscribeAppRoute,
} from './lib/routing/appRoutes';

const devChequePreview = import.meta.env.DEV
  && typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('chequePreview') === '1';

const devChequeGallery = import.meta.env.DEV
  && typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('chequeGallery') === '1';

export default function App() {
  const { ready: authReady, session } = useAuth();
  const desktop = isDesktop();
  const [page, setPage] = useState(() => pageIdFromPath(getAppPath()) || 'dashboard');
  const [projectDetailId, setProjectDetailId] = useState(null);
  const [year, setYear] = useState(2026);
  const [hidden, setHidden] = useState(false);
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [office, setOffice] = useState(DEFAULT_OFFICE_SETTINGS);
  const [officeReady, setOfficeReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [dataEpoch, setDataEpoch] = useState(0);
  const saveTimer = useRef(null);
  const skipOfficeSave = useRef(true);
  const navGroups = useMemo(() => filterNavGroups(NAV_GROUPS, session?.user), [session]);

  const handleNavigate = useCallback((nextPage) => {
    setPage(nextPage);
    if (nextPage === 'checks') {
      const sub = parseChequeRoute(getAppPath());
      if (!sub) navigateApp('/cheques');
    } else if (parseChequeRoute(getAppPath())) {
      navigateApp('/', { replace: true });
    }
  }, []);

  useEffect(() => {
    if (!desktop) return undefined;
    document.documentElement.dataset.desktop = 'true';
    document.documentElement.dataset.platform = window.oday?.platform || '';
    return () => {
      delete document.documentElement.dataset.desktop;
      delete document.documentElement.dataset.platform;
    };
  }, [desktop]);

  useEffect(() => {
    if (!session) {
      setReady(false);
      setOfficeReady(false);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const [dash, officeData] = await Promise.all([getItem('dashboard-settings'), loadOfficeSettings()]);
        if (cancelled) return;
        if (dash && dash.value) {
          const parsed = JSON.parse(dash.value);
          if (parsed.year) setYear(parsed.year);
          if (typeof parsed.hidden === 'boolean') setHidden(parsed.hidden);
        }
        setOffice(officeData);
        applyOfficeAppearance(officeData);
        skipOfficeSave.current = true;
      } catch {
        applyOfficeAppearance(DEFAULT_OFFICE_SETTINGS);
        skipOfficeSave.current = true;
      }
      if (!cancelled) {
        setReady(true);
        setOfficeReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (!ready || !session) return;
    (async () => {
      try {
        await setItem('dashboard-settings', JSON.stringify({ year, hidden }));
      } catch {
        /* ignore persistence errors */
      }
    })();
  }, [year, hidden, ready, session]);

  useEffect(() => {
    if (!officeReady || !session) return undefined;
    applyOfficeAppearance(office);
    if (skipOfficeSave.current) {
      skipOfficeSave.current = false;
      return undefined;
    }
    setSaveStatus('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await saveOfficeSettings(office);
        setSaveStatus('saved');
      } catch {
        setSaveStatus('idle');
      }
    }, 700);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [office, officeReady, session]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
      if ((event.ctrlKey || event.metaKey) && event.key === ',') {
        event.preventDefault();
        handleNavigate('settings');
      }
      if ((event.ctrlKey || event.metaKey) && event.key >= '1' && event.key <= '9') {
        const allowed = navGroups.flatMap((group) => group.items.map((item) => item.id));
        const next = allowed[Number(event.key) - 1];
        if (next) {
          event.preventDefault();
          handleNavigate(next);
        }
      }
    }
    function onResize() {
      if (window.innerWidth >= 768) setMenuOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
    };
  }, [navGroups, handleNavigate]);

  useEffect(() => {
    const scroller = document.querySelector('[data-app-scroll]');
    if (!scroller) return undefined;
    const previous = scroller.style.overflowY;
    scroller.style.overflowY = menuOpen ? 'hidden' : previous;
    return () => {
      scroller.style.overflowY = previous;
    };
  }, [menuOpen]);

  useEffect(() => {
    const user = session?.user;
    if (!user) return;
    const allowed = Object.keys(PAGE_PERMISSIONS).filter((id) => canOpenPage(user, id));
    if (allowed.length && !allowed.includes(page)) setPage(allowed[0]);
  }, [session, page]);

  useEffect(() => {
    if (!session) return undefined;
    function syncFromPath() {
      const path = getAppPath();
      const fromPath = pageIdFromPath(path);
      if (fromPath && fromPath !== page) setPage(fromPath);
    }
    syncFromPath();
    return subscribeAppRoute(syncFromPath);
  }, [session, page]);

  useEffect(() => {
    if (page !== 'projects') setProjectDetailId(null);
  }, [page]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const backup = params.get('backup');
    if (!backup) return;
    if (backup === 'google-connected') {
      setPage('settings');
      showToast('تم ربط Google Drive بنجاح', 'ok');
    } else if (backup === 'google-error') {
      setPage('settings');
      showToast('تعذر إكمال ربط Google Drive', 'error');
    }
    if (params.get('section') === 'backup') {
      setPage('settings');
    }
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

  useEffect(() => {
    const lang = office.language === 'en' ? 'en' : 'ar';
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
  }, [office.language]);

  if (!authReady) {
    return (
      <div className="h-dvh flex flex-col" style={{ background: C.paper, color: C.inkSoft, fontFamily: FONT_BODY }}>
        {desktop ? <DesktopTitleBar /> : null}
        <div className="flex-1 flex items-center justify-center">جارِ التحميل...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="h-svh flex flex-col overflow-hidden" style={{ background: C.sidebar }}>
        {desktop ? <DesktopTitleBar /> : null}
        <div className="flex-1 min-h-0">
          <Login />
        </div>
        <UpdateListener />
        <ToastHost />
      </div>
    );
  }

  return (
    <div dir={office.language === 'en' ? 'ltr' : 'rtl'} lang={office.language === 'en' ? 'en' : 'ar'} className="h-dvh overflow-hidden flex flex-col" style={{ fontFamily: FONT_BODY }}>
      {desktop ? <DesktopTitleBar /> : null}
      <div className="app-frame" style={{ background: C.paper }}>
        <Sidebar
          active={page}
          onNavigate={handleNavigate}
          navGroups={navGroups}
          sidebarDark={getPalette(office.paletteId).sidebarDark}
          menuOpen={menuOpen}
          onCloseMenu={() => setMenuOpen(false)}
          userLabel={displayName(session.user)}
          desktop={desktop}
        />

        <div className="app-main">
          <div
            className="absolute inset-0 pointer-events-none print-hide phone-hide"
            style={{
              backgroundImage: `radial-gradient(circle, ${C.dot} 1px, transparent 1px)`,
              backgroundSize: '24px 24px',
              opacity: 0.4,
            }}
          />
          <BrandLogo
            variant="lockup"
            decorative
            className="absolute pointer-events-none select-none print-hide phone-hide"
            style={{ width: 380, height: 'auto', left: -48, bottom: -28, opacity: 0.045 }}
          />
          <TopBar
            page={page}
            year={year}
            setYear={setYear}
            hidden={hidden}
            pageMeta={PAGE_META}
            years={YEARS}
            menuOpen={menuOpen}
            onToggleMenu={() => setMenuOpen((open) => !open)}
            desktop={desktop}
            onNavigate={handleNavigate}
            navGroups={navGroups}
          />
          <div className="app-scroll" data-app-scroll>
            <div className="app-content">
              <OfflineBanner />
              {devChequeGallery ? (
                <ChequeDesignGallery />
              ) : devChequePreview ? (
                <ChequePreviewPlayground />
              ) : page === 'dashboard' ? (
                <Dashboard key={dataEpoch} year={year} hidden={hidden} onNavigate={handleNavigate} />
              ) : page === 'projects' && projectDetailId ? (
                <ProjectDetail
                  projectId={projectDetailId}
                  hidden={hidden}
                  onBack={() => setProjectDetailId(null)}
                />
              ) : page === 'projects' ? (
                <Projects
                  hidden={hidden}
                  onOpenProject={(id) => setProjectDetailId(id)}
                />
              ) : page === 'clients' ? (
                <Clients hidden={hidden} onNavigate={handleNavigate} />
              ) : page === 'documents' ? (
                <Documents />
              ) : page === 'invoices' ? (
                <Invoices hidden={hidden} />
              ) : page === 'dead-debts' ? (
                <DeadDebts hidden={hidden} />
              ) : page === 'payments' ? (
                <Payments hidden={hidden} />
              ) : page === 'checks' ? (
                <Cheques hidden={hidden} />
              ) : page === 'expenses' ? (
                <Expenses hidden={hidden} />
              ) : page === 'payroll' ? (
                <Payroll hidden={hidden} />
              ) : page === 'reports' ? (
                <Reports />
              ) : page === 'ai-assistant' ? (
                <AiAssistant />
              ) : page === 'settings' ? (
                <>
                  <SessionPanel />
                  <Settings
                    settings={office}
                    onChange={setOffice}
                    onSave={async () => {
                      setSaveStatus('saving');
                      try {
                        await saveOfficeSettings(office);
                        applyOfficeAppearance(office);
                        setSaveStatus('saved');
                      } catch {
                        setSaveStatus('idle');
                      }
                    }}
                    status={saveStatus}
                    loaded={officeReady}
                    onImported={async (payload) => {
                      if (payload.officeSettings) {
                        const next = mergeOfficeSettings(payload.officeSettings);
                        setOffice(next);
                        applyOfficeAppearance(next);
                      }
                      if (payload.dashboardSettings) {
                        if (payload.dashboardSettings.year) setYear(payload.dashboardSettings.year);
                        if (typeof payload.dashboardSettings.hidden === 'boolean') {
                          setHidden(payload.dashboardSettings.hidden);
                        }
                      }
                      setDataEpoch((n) => n + 1);
                      setSaveStatus('saved');
                    }}
                  />
                </>
              ) : (
                <Dashboard year={year} hidden={hidden} onNavigate={handleNavigate} />
              )}
            </div>
          </div>
        </div>
      </div>
      {desktop || menuOpen ? null : (
        <BottomNav
          active={page}
          onNavigate={handleNavigate}
          onMore={() => setMenuOpen(true)}
          navGroups={navGroups}
        />
      )}
      <UpdateListener />
      <ToastHost />
    </div>
  );
}
