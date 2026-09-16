import { useEffect } from 'react';
import { X } from 'lucide-react';
import { C, FONT_HEAD, RADIUS } from '../../theme';

export function Sheet({ open, title, onClose, children, wide = false }) {
  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="os-sheet-root fixed inset-0 z-[70] flex items-stretch justify-end">
      <button type="button" className="absolute inset-0" style={{ background: 'color-mix(in srgb, var(--c-ink) 38%, transparent)' }} onClick={onClose} aria-label="إغلاق" />
      <aside
        className="os-sheet-panel relative h-full overflow-y-auto p-5 sm:p-7"
        style={{
          width: 'min(100%, ' + (wide ? '560px' : '440px') + ')',
          background: C.card,
          borderInlineStart: `1px solid ${C.border}`,
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <h2 className="text-2xl font-semibold" style={{ color: C.ink, fontFamily: FONT_HEAD }}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="no-drag min-h-11 min-w-11 flex items-center justify-center"
            style={{ border: `1px solid ${C.border}`, color: C.ink, borderRadius: RADIUS.md }}
            aria-label="إغلاق"
          >
            <X size={16} />
          </button>
        </div>
        <div className="space-y-4">{children}</div>
      </aside>
    </div>
  );
}
