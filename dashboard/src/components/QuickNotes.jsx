import { useEffect, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { C, FONT_HEAD, FONT_BODY, cardShadow } from '../theme';
import { getItem, setItem } from '../lib/storage';

export function QuickNotes() {
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('idle');
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef(null);

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

  function handleChange(e) {
    const v = e.target.value;
    setNotes(v);
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
      className="rounded-2xl p-4 sm:p-6 fade-up"
      style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: cardShadow, animationDelay: '420ms' }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 mb-3">
        <h3 className="text-base sm:text-lg font-semibold" style={{ color: C.ink, fontFamily: FONT_HEAD }}>
          مذكّرات المكتب
        </h3>
        <div className="flex items-center gap-1 text-xs shrink-0" style={{ color: C.inkFaint }} aria-live="polite">
          {status === 'saving' && (
            <>
              <Loader2 size={13} className="animate-spin" aria-hidden="true" />
              <span>جارِ الحفظ...</span>
            </>
          )}
          {status === 'saved' && (
            <>
              <Check size={13} style={{ color: C.emerald }} aria-hidden="true" />
              <span>تم الحفظ</span>
            </>
          )}
        </div>
      </div>
      <textarea
        value={notes}
        onChange={handleChange}
        placeholder="متابعة مواقع، مواعيد تسليم مخططات، أو ملاحظات اجتماعات العملاء..."
        rows={4}
        disabled={!loaded}
        aria-label="ملاحظات سريعة"
        className="w-full max-w-full min-w-0 rounded-xl p-3 text-sm resize-none outline-none block"
        style={{ background: C.paper, border: `1px solid ${C.border}`, color: C.ink, fontFamily: FONT_BODY }}
      />
      <p className="text-[11px] mt-2" style={{ color: C.inkFaint }}>
        محفوظة أونلاين وتظهر من الجوال أو المكتب بعد الحفظ
      </p>
    </section>
  );
}
