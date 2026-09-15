import { useEffect, useState } from 'react';
import { C } from '../../theme';
import { hideToast, onToast } from '../../lib/toast';

export function ToastHost() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const off = onToast(setToast);
    return off;
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => hideToast(), toast.duration || 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  const tone = toast.tone === 'error' ? C.burgundy : toast.tone === 'ok' ? C.emerald : C.ink;

  return (
    <div
      className="os-toast print-hide fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] px-4 py-3 text-sm"
      role="status"
      style={{ background: C.card, color: tone, border: `1px solid ${C.border}`, minWidth: 240, borderRadius: 8 }}
    >
      {toast.message}
    </div>
  );
}
