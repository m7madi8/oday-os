import { useEffect, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { FONT_HEAD, RADIUS, C } from '../theme';
import { getItem, setItem } from '../lib/storage';

function autosize(node) {
  if (!node) return;
  node.style.height = 'auto';
  node.style.height = `${Math.max(node.scrollHeight, 72)}px`;
}

export function QuickNotes() {
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
    autosize(areaRef.current);
  }, [notes, loaded]);

  function handleChange(e) {
    const v = e.target.value;
    setNotes(v);
    autosize(e.target);
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
      className="os-surface p-4 sm:p-6 fade-up"
      style={{
        background: C.paper,
        border: `1px solid ${C.border}`,
        borderRadius: RADIUS.md,
        animationDelay: '420ms',
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 mb-3">
        <h3 style={{ color: C.ink, fontFamily: FONT_HEAD, fontSize: 22, fontWeight: 600 }}>
          مذكّرات المكتب
        </h3>
        <div className="flex items-center gap-1 shrink-0" style={{ color: C.inkSoft, fontSize: '1rem' }} aria-live="polite">
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
        placeholder="متابعة مواقع، مواعيد تسليم مخططات، أو ملاحظات اجتماعات العملاء..."
        rows={3}
        disabled={!loaded}
        aria-label="ملاحظات سريعة"
        className="os-notes-area"
      />
      <p className="mt-2 text-start" style={{ color: C.inkSoft, fontSize: '1rem' }}>
        محفوظة أونلاين وتظهر من الجوال أو المكتب بعد الحفظ
      </p>
    </section>
  );
}
