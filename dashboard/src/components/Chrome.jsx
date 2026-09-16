import { useEffect, useRef, useState } from 'react';
import { ChevronDown, MoreHorizontal, X } from 'lucide-react';
import { C, FONT_SERIF, RADIUS } from '../theme';
import { BrandLogo } from './BrandLogo';
import { BRAND } from '../brand';
import { FINANCE_PAGE_IDS, mobileTabItems } from '../lib/navigation';

export { TopBar } from './TopBar';

const ICON_STROKE = 1.5;

function sectionLabelStyle() {
  return {
    fontSize: '1rem',
    fontWeight: 600,
    letterSpacing: '0.02em',
    color: C.sidebarText,
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
          color: financeActive ? C.sidebarTitle : C.sidebarTextFaint,
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
        color: isActive ? C.sidebarTitle : C.sidebarText,
        borderRadius: RADIUS.sm,
      }}
    >
      {isActive ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-2 start-0 w-px"
          style={{ background: C.lime }}
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
  const [expanded, setExpanded] = useState({ المالية: false });
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
          style={{ background: 'color-mix(in srgb, var(--c-ink) 45%, transparent)' }}
          onClick={onCloseMenu}
          aria-hidden="true"
        />
      )}

      <aside
        id="app-sidebar"
        className={asideClass}
        style={{ background: C.sidebar }}
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
          if (dx < -48) onCloseMenu?.();
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
                style={{ color: C.sidebarTitle, borderRadius: RADIUS.md }}
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
              style={{ color: C.sidebarTitle, fontFamily: FONT_SERIF, fontWeight: 600 }}
              dir="ltr"
            >
              {BRAND.product}
            </div>
          </div>
          <div
            className={desktop ? 'w-full mt-3 block' : 'w-full mt-3 block md:hidden lg:block'}
            style={{ height: 1, background: C.sidebarLine }}
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
          style={{ borderTop: `1px solid ${C.sidebarLine}` }}
        >
          <div
            className="leading-snug"
            style={{ color: C.sidebarTitle, fontSize: '1.0625rem', fontWeight: 500 }}
            dir="ltr"
          >
            {BRAND.firm}
          </div>
          <div className="mt-1" style={{ color: C.sidebarText, fontSize: '1rem' }}>
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
        <button
          type="button"
          onClick={onMore}
          className="os-tab no-drag"
          aria-label="المزيد"
        >
          <MoreHorizontal size={18} strokeWidth={1.8} aria-hidden="true" />
          المزيد
        </button>
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
        background: C.sidebar,
      }}
      aria-hidden="true"
    />
  );
}
