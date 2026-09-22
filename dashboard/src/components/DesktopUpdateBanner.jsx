import { useEffect, useState } from 'react';
import { Download, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { isDesktop } from '../lib/desktop';
import { C, FONT_HEAD, RADIUS } from '../theme';
import { GhostButton, PrimaryButton } from './ui/Actions';

const IDLE = { phase: 'idle', currentVersion: '0.0.0' };

export function DesktopUpdateBanner() {
  const [state, setState] = useState(IDLE);

  useEffect(() => {
    if (!isDesktop() || !window.oday?.updates) return undefined;

    let mounted = true;

    window.oday.updates.getState?.().then((next) => {
      if (mounted && next) setState(next);
    });

    const offState = window.oday.updates.onState?.((next) => {
      if (next) setState(next);
    });

    const onOnline = () => {
      void window.oday?.updates?.check?.();
    };
    window.addEventListener('online', onOnline);

    return () => {
      mounted = false;
      offState?.();
      window.removeEventListener('online', onOnline);
    };
  }, []);

  const { phase, version, percent, currentVersion } = state;
  if (!isDesktop() || phase === 'idle' || phase === 'error' || phase === 'checking') {
    return null;
  }

  const title =
    phase === 'available'
      ? 'يتوفر تحديث جديد'
      : phase === 'downloading'
        ? 'جارٍ تنزيل التحديث…'
        : 'التحديث جاهز';

  const body =
    phase === 'available'
      ? `الإصدار ${version} — الإصدار الحالي ${currentVersion}`
      : phase === 'downloading'
        ? `${Math.max(0, Math.min(100, percent || 0))}%`
        : 'أعد التشغيل لتثبيت أحدث نسخة من ODAY OS.';

  return (
    <aside
      className="os-update-banner"
      role="status"
      aria-live="polite"
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: RADIUS.md,
        boxShadow: '0 12px 40px color-mix(in srgb, var(--c-ink) 12%, transparent)',
      }}
    >
      <div className="flex items-start gap-3 min-w-0">
        <span
          className="shrink-0 flex items-center justify-center rounded-xl"
          style={{ width: 40, height: 40, background: C.tint, color: C.ink }}
        >
          {phase === 'downloading' ? (
            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
          ) : phase === 'ready' ? (
            <Sparkles size={18} aria-hidden="true" />
          ) : (
            <Download size={18} aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold" style={{ color: C.ink, fontFamily: FONT_HEAD }}>
            {title}
          </p>
          <p className="text-sm mt-0.5" style={{ color: C.inkSoft }}>{body}</p>
          {phase === 'downloading' ? (
            <div
              className="mt-2 h-1.5 rounded-full overflow-hidden"
              style={{ background: C.tint }}
              aria-hidden="true"
            >
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${Math.max(4, Math.min(100, percent || 0))}%`,
                  background: C.emerald,
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
      {phase === 'ready' ? (
        <div className="flex flex-wrap gap-2 mt-3 justify-end">
          <GhostButton onClick={() => window.oday?.updates?.dismiss?.()}>لاحقاً</GhostButton>
          <PrimaryButton onClick={() => void window.oday?.updates?.install?.()}>
            <RefreshCw size={15} />
            تحديث الآن
          </PrimaryButton>
        </div>
      ) : null}
    </aside>
  );
}
