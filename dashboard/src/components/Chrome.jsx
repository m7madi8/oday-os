import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Menu, MoreHorizontal, X } from 'lucide-react';
import { C, FONT_HEAD, FONT_SERIF, RADIUS } from '../theme';
import { BrandLogo } from './BrandLogo';
import { BRAND } from '../brand';
import { FINANCE_PAGE_IDS, mobileTabItems } from '../lib/navigation';

const ICON_STROKE = 1.5;

function sectionLabelStyle() {
  return {
    fontSize: '1rem',
    fontWeight: 600,
    letterSpacing: '0.02em',
    color: 'var(--warm-300)',
    textTransform: 'none',
  };
}

function CollapsibleNavSection({
  group,
  isExpanded,
  isClosing,
  onToggle,
  active,
  onNavigate,
  financeActive,
  full = false,
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
        className={`no-drag w-full flex items-center justify-between gap-2 px-2.5 py-1.5 min-h-10 ${
          full ? 'flex' : 'flex md:hidden lg:flex'
        }`}
        style={{
          ...sectionLabelStyle(),
          color: financeActive ? 'var(--paper-50)' : 'var(--warm-500)',
        }}
      >
        <span>{group.title}</span>
        <ChevronDown
          size={18}
          strokeWidth={ICON_STROKE}
          aria-hidden="true"
          className={`nav-collapse-chevron shrink-0 ${isExpanded && !isClosing ? 'is-open' : ''}`}
        />
      </button>

      {panelOpen ? (
        <div
          className={`nav-collapse ${full ? 'block' : 'block md:hidden lg:block'} ${animateIn ? 'is-open' : ''} ${isClosing ? 'is-closing' : ''}`}
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
                    full={full}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {full ? null : (
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
      )}
    </>
  );
}

function NavItem({ item, isActive, onNavigate, nested = false, full = false }) {
  const Icon = item.icon;
  const labelClass = full ? 'inline' : 'inline md:hidden lg:inline';
  const iconClass = full ? 'shrink-0' : 'shrink-0 mx-0 md:mx-auto lg:mx-0';

  return (
    <button
      type="button"
      onClick={() => onNavigate(item.id)}
      aria-current={isActive ? 'page' : undefined}
      aria-label={item.label}
      className={`no-drag relative w-full flex items-center gap-2.5 py-2 min-h-11 transition-colors ${
        nested ? 'ps-6 pe-2.5' : 'px-2.5'
      }`}
      style={{
        background: 'transparent',
        color: isActive ? 'var(--paper-50)' : 'var(--warm-300)',
        borderRadius: RADIUS.sm,
      }}
    >
      {isActive ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-2 start-0 w-px"
          style={{ background: 'var(--gold-500)' }}
        />
      ) : null}
      <Icon size={20} strokeWidth={ICON_STROKE} className={iconClass} aria-hidden="true" />
      <span className={`${labelClass} text-base`}>{item.label}</span>
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
  userLabel = 'مدير النظام',
  desktop = false,
}) {
  const touchStartX = useRef(null);
  const closeTimer = useRef(null);
  const [expanded, setExpanded] = useState({ المالية: true });
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

  const asideClass = desktop
    ? 'print-hide no-drag app-sidebar pointer-events-auto'
    : `print-hide no-drag app-sidebar ${menuOpen ? 'is-open' : ''}`;

  return (
    <>
      {desktop ? null : (
        <div
          className={`print-hide fixed inset-0 z-40 md:hidden ${menuOpen ? 'block' : 'hidden'}`}
          style={{ background: 'rgba(10,10,10,0.45)' }}
          onClick={onCloseMenu}
          aria-hidden="true"
        />
      )}

      <aside
        id="app-sidebar"
        className={asideClass}
        style={{ background: 'var(--black-950)' }}
        data-on-dark={sidebarDark ? 'true' : 'false'}
        role={!desktop && menuOpen ? 'dialog' : undefined}
        aria-modal={!desktop && menuOpen ? true : undefined}
        aria-label="القائمة"
        onTouchStart={(event) => {
          if (desktop) return;
          touchStartX.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          if (desktop || touchStartX.current == null) return;
          const dx = event.changedTouches[0].clientX - touchStartX.current;
          touchStartX.current = null;
          const rtl = document.dir === 'rtl' || document.documentElement.dir === 'rtl';
          if ((rtl && dx > 48) || (!rtl && dx < -48)) onCloseMenu?.();
        }}
      >
        <div className={`flex flex-col items-start px-5 pt-4 pb-3 shrink-0 ${desktop ? '' : 'md:items-center lg:items-start md:px-2.5 lg:px-5'}`}>
          <div className={`flex w-full items-center justify-between ${desktop ? '' : 'md:justify-center lg:justify-between'}`}>
            <div aria-label={BRAND.product}>
              {desktop ? null : (
                <BrandLogo
                  variant="mark"
                  onDark
                  decorative
                  className="hidden md:block lg:hidden shrink-0"
                  style={{ width: 28, height: 'auto' }}
                />
              )}
              <BrandLogo
                variant="lockup"
                onDark
                decorative
                className={desktop ? 'block shrink-0' : 'block md:hidden lg:block shrink-0'}
                style={{ width: 78, height: 'auto' }}
              />
            </div>
            {desktop ? null : (
              <button
                type="button"
                className="no-drag md:hidden flex items-center justify-center min-h-11 min-w-11 shrink-0"
                style={{ color: 'var(--paper-50)', borderRadius: RADIUS.md }}
                onClick={onCloseMenu}
                aria-label="إغلاق القائمة"
              >
                <X size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
              </button>
            )}
          </div>
          <div className={desktop ? 'block leading-tight mt-2' : 'block md:hidden lg:block leading-tight mt-2'}>
            <div
              className="text-base tracking-[0.08em]"
              style={{ color: 'var(--paper-50)', fontFamily: FONT_SERIF, fontWeight: 600 }}
              dir="ltr"
            >
              {BRAND.product}
            </div>
          </div>
          <div
            className={desktop ? 'w-full mt-3 block' : 'w-full mt-3 block md:hidden lg:block'}
            style={{ height: 1, background: 'var(--line-800)' }}
          />
        </div>

        <nav
          className={`app-sidebar-scroll no-drag flex-1 min-h-0 px-3 pt-1 pb-2 space-y-3 overflow-y-auto overflow-x-hidden ${desktop ? '' : 'md:px-1.5 lg:px-3'}`}
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
                    full={desktop}
                  />
                ) : (
                  <>
                    <div
                      className={desktop ? 'block px-2.5 mb-1' : 'block md:hidden lg:block px-2.5 mb-1'}
                      style={sectionLabelStyle()}
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
                          full={desktop}
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
          className={desktop ? 'px-5 py-4 block shrink-0' : 'px-5 py-4 block md:hidden lg:block shrink-0'}
          style={{ borderTop: '1px solid var(--line-800)' }}
        >
          <div
            className="leading-snug"
            style={{ color: 'var(--paper-50)', fontSize: '1.0625rem', fontWeight: 500 }}
            dir="ltr"
          >
            {BRAND.firm}
          </div>
          <div className="mt-1" style={{ color: 'var(--warm-300)', fontSize: '1rem' }}>
            {userLabel}
          </div>
        </div>
      </aside>
    </>
  );
}

export function BottomNav({ active, onNavigate, onMore, navGroups }) {
  const tabs = mobileTabItems(navGroups);

  return (
    <nav className="os-tabbar-wrap print-hide" aria-label="التنقل السفلي">
      <div className="os-tabbar">
        <button
          type="button"
          onClick={onMore}
          className="os-tab no-drag"
          aria-label="المزيد"
        >
          <MoreHorizontal size={18} strokeWidth={1.8} aria-hidden="true" />
          المزيد
        </button>
        {tabs.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`os-tab no-drag ${isActive ? 'is-active' : ''}`}
            >
              <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function DesktopTitleBar() {
  return (
    <div
      className="app-drag print-hide shrink-0"
      style={{
        height: 'env(titlebar-area-height, 40px)',
        background: 'var(--black-950)',
      }}
      aria-hidden="true"
    />
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
  desktop = false,
}) {
  const meta = pageMeta[page] || { title: page };

  return (
    <div className="print-hide app-topbar">
      {desktop ? null : (
        <button
          type="button"
          className="os-icon-btn no-drag app-topbar-menu md:hidden"
          onClick={onToggleMenu}
          aria-label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
          aria-expanded={menuOpen}
          aria-controls="app-sidebar"
        >
          {menuOpen ? <X size={18} strokeWidth={1.8} aria-hidden="true" /> : <Menu size={18} strokeWidth={1.8} aria-hidden="true" />}
        </button>
      )}

      <div className="app-topbar-heading min-w-0 overflow-hidden">
        <h1 className="app-page-title text-2xl sm:text-3xl truncate" style={{ color: C.ink, fontFamily: FONT_HEAD, fontWeight: 600 }}>
          {meta.title}
        </h1>
        {meta.subtitle ? (
          <p className="app-topbar-sub text-base mt-1 truncate" style={{ color: C.inkSoft }}>{meta.subtitle}</p>
        ) : null}
      </div>

      <div className="app-topbar-controls no-drag flex flex-nowrap items-center gap-2 shrink-0">
        <div className="relative" ref={yearRef}>
          <button
            type="button"
            onClick={() => setYearOpen((v) => !v)}
            aria-expanded={yearOpen}
            aria-haspopup="listbox"
            className="os-year-pill flex items-center gap-2 px-3 sm:px-4 py-2 text-base min-h-11"
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
          {yearOpen && (
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
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  role="option"
                  aria-selected={y === year}
                  onClick={() => { setYear(y); setYearOpen(false); }}
                  className="w-full text-start px-4 py-2 text-sm tabular-nums min-h-11"
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
          className="os-icon-btn os-eye-btn flex items-center gap-2 px-3 py-2 text-sm min-h-11"
          style={{
            background: hidden ? 'var(--black-950)' : C.card,
            border: `1px solid ${hidden ? 'var(--black-950)' : C.border}`,
            color: hidden ? 'var(--paper-50)' : C.ink,
            borderRadius: RADIUS.md,
          }}
        >
          {hidden ? <EyeOff size={17} strokeWidth={1.8} aria-hidden="true" /> : <Eye size={17} strokeWidth={1.8} aria-hidden="true" />}
          <span className="os-eye-label hidden sm:inline">{hidden ? 'إظهار المبالغ' : 'إخفاء المبالغ'}</span>
        </button>
      </div>
    </div>
  );
}
