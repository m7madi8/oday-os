import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Eye, EyeOff } from 'lucide-react';
import { C, FONT_HEAD, PAGE_META, YEARS, cardShadow } from '../theme';

export function TopBar({ page, year, setYear, hidden, setHidden }) {
  const [yearOpen, setYearOpen] = useState(false);
  const yearRef = useRef(null);
  const meta = PAGE_META[page];

  useEffect(() => {
    function onPointerDown(event) {
      if (yearRef.current && !yearRef.current.contains(event.target)) {
        setYearOpen(false);
      }
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') setYearOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6 sm:mb-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: C.ink, fontFamily: FONT_HEAD }}>
          {meta.title}
        </h1>
        {meta.subtitle ? (
          <p className="text-sm mt-1" style={{ color: C.inkSoft }}>{meta.subtitle}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative" ref={yearRef}>
          <button
            type="button"
            onClick={() => setYearOpen((v) => !v)}
            aria-expanded={yearOpen}
            aria-haspopup="listbox"
            className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium min-h-11"
            style={{ background: C.card, border: `1px solid ${C.border}`, color: C.ink, boxShadow: cardShadow }}
          >
            <span className="tabular-nums">{year}</span>
            <ChevronDown size={15} aria-hidden="true" style={{ transform: yearOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
          </button>
          {yearOpen && (
            <div
              role="listbox"
              aria-label="اختر السنة"
              className="absolute left-0 mt-1.5 rounded-xl overflow-hidden z-20"
              style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: cardShadow, minWidth: 110 }}
            >
              {YEARS.map((y) => (
                <button
                  key={y}
                  type="button"
                  role="option"
                  aria-selected={y === year}
                  onClick={() => { setYear(y); setYearOpen(false); }}
                  className="w-full text-right px-3.5 py-2 text-sm tabular-nums min-h-11"
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
          className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium min-h-11"
          style={{ background: hidden ? C.sidebar : C.card, border: `1px solid ${hidden ? C.sidebar : C.border}`, color: hidden ? C.sidebarTitle : C.ink, boxShadow: cardShadow }}
        >
          {hidden ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          <span className="hidden sm:inline">{hidden ? 'إظهار المبالغ' : 'إخفاء المبالغ'}</span>
        </button>
      </div>
    </div>
  );
}
