import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Eye, EyeOff, FileText } from 'lucide-react';
import { C, FONT_BODY, PAGE_META, YEARS, getPalette } from './theme';
import { NAV_GROUPS } from './lib/navigation';
import { BrandLogo } from './components/BrandLogo';
import { Sidebar, TopBar } from './components/Chrome';
import { PlaceholderPage } from './components/Cards';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { Invoices } from './pages/Invoices';
import { AiAssistant } from './pages/AiAssistant';
import { getItem, setItem } from './lib/storage';
import {
  DEFAULT_OFFICE_SETTINGS,
  applyOfficeAppearance,
  loadOfficeSettings,
  mergeOfficeSettings,
  saveOfficeSettings,
} from './lib/officeSettings';

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [year, setYear] = useState(2026);
  const [hidden, setHidden] = useState(false);
  const [ready, setReady] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [office, setOffice] = useState(DEFAULT_OFFICE_SETTINGS);
  const [officeReady, setOfficeReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [dataEpoch, setDataEpoch] = useState(0);
  const yearRef = useRef(null);
  const saveTimer = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [dash, officeData] = await Promise.all([getItem('dashboard-settings'), loadOfficeSettings()]);
        if (dash && dash.value) {
          const parsed = JSON.parse(dash.value);
          if (parsed.year) setYear(parsed.year);
          if (typeof parsed.hidden === 'boolean') setHidden(parsed.hidden);
        }
        setOffice(officeData);
        applyOfficeAppearance(officeData);
      } catch {
        /* use defaults */
      }
      setReady(true);
      setOfficeReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    (async () => {
      try {
        await setItem('dashboard-settings', JSON.stringify({ year, hidden }));
      } catch {
        /* ignore persistence errors */
      }
    })();
  }, [year, hidden, ready]);

  useEffect(() => {
    if (!officeReady) return;
    applyOfficeAppearance(office);
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
  }, [office, officeReady]);

  useEffect(() => {
    function onPointerDown(event) {
      if (yearRef.current && !yearRef.current.contains(event.target)) {
        setYearOpen(false);
      }
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setYearOpen(false);
        setMenuOpen(false);
      }
    }
    function onResize() {
      if (window.innerWidth >= 768) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => {
    const scroller = document.querySelector('[data-app-scroll]');
    if (!scroller) return undefined;
    const previous = scroller.style.overflowY;
    scroller.style.overflowY = menuOpen ? 'hidden' : previous;
    return () => {
      scroller.style.overflowY = previous;
    };
  }, [menuOpen]);

  return (
    <div dir="rtl" lang="ar" className="h-dvh overflow-hidden" style={{ fontFamily: FONT_BODY }}>
      <div className="flex h-full overflow-hidden" style={{ background: C.paper }}>
        <Sidebar
          active={page}
          onNavigate={setPage}
          navGroups={NAV_GROUPS}
          sidebarDark={getPalette(office.paletteId).sidebarDark}
          menuOpen={menuOpen}
          onCloseMenu={() => setMenuOpen(false)}
        />

        <div className="flex-1 min-w-0 min-h-0 relative">
          <div
            className="absolute inset-0 pointer-events-none print-hide"
            style={{
              backgroundImage: `radial-gradient(circle, ${C.dot} 1px, transparent 1px)`,
              backgroundSize: '24px 24px',
              opacity: 0.4,
            }}
          />
          <BrandLogo
            variant="lockup"
            decorative
            className="absolute pointer-events-none select-none print-hide"
            style={{ width: 380, height: 'auto', left: -48, bottom: -28, opacity: 0.045 }}
          />
          <div className="absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-contain" data-app-scroll>
            <div className="relative px-4 sm:px-8 lg:px-10 py-3 sm:py-8 max-w-7xl mx-auto">
              <TopBar
                  page={page}
                  year={year}
                  setYear={setYear}
                  hidden={hidden}
                  setHidden={setHidden}
                  pageMeta={PAGE_META}
                  years={YEARS}
                  Eye={Eye}
                  EyeOff={EyeOff}
                  ChevronDown={ChevronDown}
                  yearOpen={yearOpen}
                  setYearOpen={setYearOpen}
                  yearRef={yearRef}
                  menuOpen={menuOpen}
                  onToggleMenu={() => setMenuOpen((open) => !open)}
                />
              {page === 'dashboard' ? (
                <Dashboard key={dataEpoch} year={year} hidden={hidden} />
              ) : page === 'settings' ? (
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
              ) : page === 'invoices' ? (
                <Invoices />
              ) : page === 'ai-assistant' ? (
                <AiAssistant />
              ) : (
                <PlaceholderPage id={page} pageMeta={PAGE_META} navGroups={NAV_GROUPS} FileText={FileText} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
