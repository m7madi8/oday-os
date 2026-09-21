import { Minus, Plus, Ratio } from 'lucide-react';
import { C } from '../../theme';

const STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];

/**
 * @param {{ zoom: number, onZoom: (z: number) => void, aspectWidth: number, aspectHeight: number }} props
 */
export function ChequePreviewControls({ zoom, onZoom, aspectWidth, aspectHeight }) {
  const fit = () => {
    const viewport = document.querySelector('[data-cheque-preview-viewport]');
    if (!viewport) return;
    const pad = 24;
    const maxW = viewport.clientWidth - pad;
    const ratio = aspectWidth / aspectHeight;
    const targetW = maxW;
    const targetH = targetW / ratio;
    const baseH = aspectHeight * 3.7795275591;
    onZoom(Math.max(0.4, Math.min(2, targetH / baseH)));
  };

  const step = (dir) => {
    const idx = STEPS.findIndex((z) => z >= zoom - 0.01);
    const next = dir > 0 ? STEPS[Math.min(STEPS.length - 1, idx + 1)] : STEPS[Math.max(0, idx - 1)];
    onZoom(next);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      <button
        type="button"
        className="min-h-11 min-w-11 rounded-lg px-3"
        style={{ border: `1px solid ${C.border}`, background: C.card }}
        onClick={() => step(-1)}
        aria-label="تصغير"
      >
        <Minus size={18} />
      </button>
      <button
        type="button"
        className="min-h-11 min-w-11 rounded-lg px-3"
        style={{ border: `1px solid ${C.border}`, background: C.card }}
        onClick={() => step(1)}
        aria-label="تكبير"
      >
        <Plus size={18} />
      </button>
      <button
        type="button"
        className="min-h-11 rounded-lg px-4 text-sm"
        style={{ border: `1px solid ${C.border}`, background: C.card }}
        onClick={fit}
      >
        <Ratio size={16} className="inline me-1" />
        ملاءمة
      </button>
      <button
        type="button"
        className="min-h-11 rounded-lg px-4 text-sm"
        style={{ border: `1px solid ${C.border}`, background: C.card }}
        onClick={() => onZoom(1)}
      >
        100%
      </button>
      <span className="text-sm tabular-nums" style={{ color: C.inkSoft }}>
        {Math.round(zoom * 100)}%
      </span>
    </div>
  );
}
