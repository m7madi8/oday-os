import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';
import { C, FONT_HEAD, cardShadow } from '../theme';
import { BrandLogo } from './BrandLogo';
import { BRAND } from '../brand';
import { FINANCE_PAGE_IDS } from '../lib/navigation';

function CollapsibleNavSection({
  group,
  isExpanded,
  isClosing,
  onToggle,
  active,
  onNavigate,
  financeActive,
}) {
  const count = group.items.length;
  const panelOpen = isExpanded || isClosing;
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (!panelOpen) {
      setAnimateIn(false);
      return undefined;
    }

    if (isClosing) {
      setAnimateIn(true);
      return undefined;
    }

    setAnimateIn(false);
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setAnimateIn(true));
    });
    return () => cancelAnimationFrame(raf);
  }, [panelOpen, isClosing]);

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 min-h-10 block md:hidden lg:flex"
        style={{ color: financeActive ? C.sidebarTitle : C.sidebarTextFaint }}
      >
        <span className="text-xs font-medium">{group.title}</span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={`nav-collapse-chevron shrink-0 ${isExpanded && !isClosing ? 'is-open' : ''}`}
        />
      </button>

      {panelOpen ? (
        <div
          className={`nav-collapse block md:hidden lg:block ${animateIn ? 'is-open' : ''} ${isClosing ? 'is-closing' : ''}`}
          style={{ '--nav-count': count }}
        >
          <div className="nav-collapse-inner">
            <div className="space-y-0.5">
              {group.items.map((item, index) => (
                <div
                  key={item.id}
                  className="nav-collapse-item"
                  style={{ '--nav-stagger': index }}
                >
                  <NavItem
                    item={item}
                    isActive={active === item.id}
                    onNavigate={onNavigate}
                    nested
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="hidden md:flex lg:hidden flex-col gap-0.5">
        {group.items.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            isActive={active === item.id}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </>
  );
}

function NavItem({ item, isActive, onNavigate, nested = false }) {
  const Icon = item.icon;
  const isAccent = Boolean(item.accent);

  return (
    <button
      type="button"
      onClick={() => onNavigate(item.id)}
      aria-current={isActive ? 'page' : undefined}
      aria-label={item.label}
      className={`w-full flex items-center gap-2.5 rounded-lg py-2 transition-colors min-h-11 md:min-h-10 ${
        nested ? 'pr-4 lg:pr-6 pl-2.5' : 'px-2.5'
      }`}
      style={{
        background: isActive
          ? isAccent
            ? 'linear-gradient(135deg, rgba(167,139,250,0.18) 0%, rgba(99,102,241,0.12) 100%)'
            : C.sidebarSoft
          : 'transparent',
        color: isActive ? C.sidebarTitle : C.sidebarText,
        position: 'relative',
      }}
    >
      {isActive && (
        <span
          className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: 3,
            height: 14,
            background: isAccent
              ? 'linear-gradient(180deg, #a78bfa 0%, #6366f1 100%)'
              : C.bronze1,
          }}
        />
      )}
      {isAccent ? (
        <span
          className="flex items-center justify-center rounded-lg shrink-0 mx-0 md:mx-auto lg:mx-0"
          style={{
            width: 28,
            height: 28,
            background: isActive
              ? 'linear-gradient(135deg, #a78bfa 0%, #6366f1 55%, #38bdf8 100%)'
              : 'linear-gradient(135deg, rgba(167,139,250,0.35) 0%, rgba(99,102,241,0.28) 100%)',
            boxShadow: isActive ? '0 4px 14px -4px rgba(99,102,241,0.55)' : 'none',
          }}
        >
          <Icon size={14} strokeWidth={2} color="#fff" aria-hidden="true" />
        </span>
      ) : (
        <Icon size={16} strokeWidth={1.7} className="shrink-0 mx-0 md:mx-auto lg:mx-0" aria-hidden="true" />
      )}
      <span className="inline md:hidden lg:inline text-sm">{item.label}</span>
    </button>
  );
}

export function Sidebar({
  active,
  onNavigate,
  navGroups,
  sidebarDark = true,
  menuOpen = false,
  onCloseMenu,
}) {
  const touchStartX = useRef(null);
  const closeTimer = useRef(null);
  const [expanded, setExpanded] = useState({ المالية: FINANCE_PAGE_IDS.includes(active) });
  const [closing, setClosing] = useState({ المالية: false });

  useEffect(() => {
    if (FINANCE_PAGE_IDS.includes(active)) {
      setExpanded((prev) => ({ ...prev, المالية: true }));
      setClosing((prev) => ({ ...prev, المالية: false }));
    }
  }, [active]);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  function handleNavigate(id) {
    onNavigate(id);
    onCloseMenu?.();
  }

  function toggleGroup(title, itemCount = 5) {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }

    if (expanded[title]) {
      setClosing((prev) => ({ ...prev, [title]: true }));
      closeTimer.current = setTimeout(() => {
        setExpanded((prev) => ({ ...prev, [title]: false }));
        setClosing((prev) => ({ ...prev, [title]: false }));
        closeTimer.current = null;
      }, 340 + itemCount * 36);
      return;
    }

    setClosing((prev) => ({ ...prev, [title]: false }));
    setExpanded((prev) => ({ ...prev, [title]: true }));
  }

  return (
    <>
      <div
        className={`print-hide fixed inset-0 z-40 md:hidden ${menuOpen ? 'block' : 'hidden'}`}
        style={{ background: 'rgba(0,0,0,0.45)' }}
        onClick={onCloseMenu}
        aria-hidden="true"
      />

      <aside
        id="app-sidebar"
        className={`print-hide fixed inset-y-0 right-0 z-50 w-72 flex flex-col overflow-hidden transform transition-transform duration-200 ease-out motion-reduce:transition-none md:static md:z-auto md:w-16 md:translate-x-0 md:shrink-0 md:h-full lg:w-64 ${
          menuOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none md:pointer-events-auto'
        }`}
        style={{ background: C.sidebar, borderLeft: `1px solid ${C.sidebarLine}` }}
        role={menuOpen ? 'dialog' : undefined}
        aria-modal={menuOpen ? true : undefined}
        aria-label="القائمة"
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          if (touchStartX.current == null) return;
          const dx = event.changedTouches[0].clientX - touchStartX.current;
          touchStartX.current = null;
          if (dx > 48) onCloseMenu?.();
        }}
      >
        <div className="flex flex-col items-start md:items-center lg:items-start px-5 md:px-2.5 lg:px-5 pt-4 pb-3 shrink-0">
          <div className="flex w-full items-center justify-between md:justify-center lg:justify-between">
            <div aria-label={BRAND.product}>
              <BrandLogo
                variant="mark"
                onDark={sidebarDark}
                decorative
                className="hidden md:block lg:hidden shrink-0"
                style={{ width: 28, height: 'auto' }}
              />
              <BrandLogo
                variant="lockup"
                onDark={sidebarDark}
                decorative
                className="block md:hidden lg:block shrink-0"
                style={{ width: 78, height: 'auto' }}
              />
            </div>
            <button
              type="button"
              className="md:hidden flex items-center justify-center rounded-xl min-h-11 min-w-11 shrink-0"
              style={{ color: C.sidebarTitle }}
              onClick={onCloseMenu}
              aria-label="إغلاق القائمة"
            >
              <X size={20} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>
          <div className="block md:hidden lg:block leading-tight mt-2">
            <div
              className="text-sm font-semibold tracking-[0.14em]"
              style={{ color: C.sidebarTitle, fontFamily: FONT_HEAD }}
              dir="ltr"
            >
              {BRAND.product}
            </div>
          </div>
          <div
            className="w-full mt-3 block md:hidden lg:block"
            style={{ height: 1, background: `linear-gradient(90deg, ${C.bronzeLine}, transparent)` }}
          />
        </div>

        <nav
          className="flex-1 min-h-0 px-3 md:px-1.5 lg:px-3 pt-1 pb-2 space-y-3 overflow-y-auto overflow-x-hidden"
          aria-label="القائمة الرئيسية"
        >
          {navGroups.map((group) => {
            const isCollapsible = Boolean(group.collapsible);
            const isOpen = isCollapsible ? expanded[group.title] : true;
            const isClosing = isCollapsible ? closing[group.title] : false;
            const financeActive = isCollapsible && FINANCE_PAGE_IDS.includes(active);

            return (
              <div key={group.title}>
                {isCollapsible ? (
                  <CollapsibleNavSection
                    group={group}
                    isExpanded={isOpen}
                    isClosing={isClosing}
                    onToggle={() => toggleGroup(group.title, group.items.length)}
                    active={active}
                    onNavigate={handleNavigate}
                    financeActive={financeActive}
                  />
                ) : (
                  <>
                    <div
                      className="block md:hidden lg:block text-xs px-2.5 mb-1 font-medium"
                      style={{ color: C.sidebarTextFaint }}
                    >
                      {group.title}
                    </div>
                    <div className="space-y-0.5">
                      {group.items.map((item) => (
                        <NavItem
                          key={item.id}
                          item={item}
                          isActive={active === item.id}
                          onNavigate={handleNavigate}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </nav>

        <div
          className="px-5 py-4 block md:hidden lg:block shrink-0"
          style={{ borderTop: `1px solid ${C.sidebarLine}` }}
        >
          <div
            className="text-xs font-medium leading-snug"
            style={{ color: C.sidebarTitle }}
            dir="ltr"
          >
            {BRAND.firm}
          </div>
          <div className="text-[11px] mt-1" style={{ color: C.sidebarTextFaint }}>
            مدير النظام
          </div>
        </div>
      </aside>
    </>
  );
}

export function TopBar({
  page,
  year,
  setYear,
  hidden,
  setHidden,
  pageMeta,
  years,
  Eye,
  EyeOff,
  ChevronDown,
  yearOpen,
  setYearOpen,
  yearRef,
  menuOpen = false,
  onToggleMenu,
}) {
  const meta = pageMeta[page] || { title: page };

  return (
    <div
      className="print-hide sticky top-0 z-30 md:static flex flex-nowrap items-center lg:items-start justify-between gap-2 sm:gap-4 mb-4 sm:mb-8 -mx-4 px-4 sm:mx-0 sm:px-0 py-3 sm:py-0"
      style={{ background: C.paper }}
    >
      <button
        type="button"
        className="md:hidden flex items-center justify-center rounded-xl min-h-11 min-w-11 shrink-0"
        style={{ background: C.card, border: `1px solid ${C.border}`, color: C.ink, boxShadow: cardShadow }}
        onClick={onToggleMenu}
        aria-label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
        aria-expanded={menuOpen}
        aria-controls="app-sidebar"
      >
        {menuOpen ? <X size={18} strokeWidth={1.8} aria-hidden="true" /> : <Menu size={18} strokeWidth={1.8} aria-hidden="true" />}
      </button>

      <div className="min-w-0 flex-1 overflow-hidden">
        <h1 className="text-xl sm:text-3xl font-bold truncate" style={{ color: C.ink, fontFamily: FONT_HEAD }}>
          {meta.title}
        </h1>
        {meta.subtitle ? (
          <p className="text-xs sm:text-sm mt-1 truncate" style={{ color: C.inkSoft }}>{meta.subtitle}</p>
        ) : null}
      </div>

      <div className="flex flex-nowrap items-center gap-2 shrink-0">
        <div className="relative" ref={yearRef}>
          <button
            type="button"
            onClick={() => setYearOpen((v) => !v)}
            aria-expanded={yearOpen}
            aria-haspopup="listbox"
            className="flex items-center gap-2 rounded-xl px-3 sm:px-4 py-2 text-sm font-medium min-h-11"
            style={{ background: C.card, border: `1px solid ${C.border}`, color: C.ink, boxShadow: cardShadow }}
          >
            <span className="tabular-nums">{year}</span>
            <ChevronDown size={15} aria-hidden="true" style={{ transform: yearOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
          </button>
          {yearOpen && (
            <div
              role="listbox"
              className="absolute left-0 mt-1 rounded-xl overflow-hidden z-20"
              style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: cardShadow, minWidth: 110 }}
            >
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  role="option"
                  aria-selected={y === year}
                  onClick={() => { setYear(y); setYearOpen(false); }}
                  className="w-full text-right px-4 py-2 text-sm tabular-nums min-h-11"
                  style={{ background: y === year ? C.tint : 'transparent', color: C.ink }}
                >
                  {y}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setHidden((v) => !v)}
          aria-pressed={hidden}
          aria-label={hidden ? 'إظهار المبالغ' : 'إخفاء المبالغ'}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium min-h-11"
          style={{ background: hidden ? C.sidebar : C.card, border: `1px solid ${hidden ? C.sidebar : C.border}`, color: hidden ? C.sidebarTitle : C.ink, boxShadow: cardShadow }}
        >
          {hidden ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          <span className="hidden sm:inline">{hidden ? 'إظهار المبالغ' : 'إخفاء المبالغ'}</span>
        </button>
      </div>
    </div>
  );
}
