import { useEffect, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { FONT_HEAD, RADIUS, C } from '../theme';
import { getItem, setItem } from '../lib/storage';

function autosize(node, minHeight = 72) {
  if (!node) return;
  node.style.height = 'auto';
  node.style.height = `${Math.max(node.scrollHeight, minHeight)}px`;
}

export function QuickNotes({ variant = 'default' }) {
  const isDesk = variant === 'desk';
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('idle');
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef(null);
  const areaRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getItem('quick-notes');
        if (res && typeof res.value === 'string') setNotes(res.value);
      } catch {
        /* keep empty notes if storage is unavailable */
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    autosize(areaRef.current, isDesk ? 280 : 72);
  }, [notes, loaded, isDesk]);

  function handleChange(e) {
    const v = e.target.value;
    setNotes(v);
    autosize(e.target, isDesk ? 280 : 72);
    setStatus('saving');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        await setItem('quick-notes', v);
        setStatus('saved');
      } catch {
        setStatus('idle');
      }
    }, 700);
  }

  return (
    <section
      className={`os-surface os-quick-notes ${isDesk ? 'os-quick-notes--desk' : ''} p-4 sm:p-6 fade-up`}
      style={{
        background: isDesk ? C.tint : C.paper,
        border: `1px solid ${isDesk ? C.border : C.border}`,
        borderRadius: RADIUS.lg,
        animationDelay: isDesk ? '0ms' : '420ms',
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <h3 style={{ color: C.ink, fontFamily: FONT_HEAD, fontSize: 22, fontWeight: 600 }}>
          مذكّرات المكتب
        </h3>
        <div className="flex items-center gap-1 shrink-0" style={{ color: C.inkSoft, fontSize: '0.875rem' }} aria-live="polite">
          {status === 'saving' && (
            <>
              <Loader2 size={16} strokeWidth={1.5} className="animate-spin" aria-hidden="true" />
              <span>جارِ الحفظ...</span>
            </>
          )}
          {status === 'saved' && (
            <>
              <Check size={16} strokeWidth={1.5} style={{ color: C.emerald }} aria-hidden="true" />
              <span>تم الحفظ</span>
            </>
          )}
        </div>
      </div>
      <textarea
        ref={areaRef}
        value={notes}
        onChange={handleChange}
        rows={3}
        disabled={!loaded}
        aria-label="مذكّرات المكتب"
        className={`os-notes-area ${isDesk ? 'os-notes-area--desk' : ''}`}
      />
    </section>
  );
}
