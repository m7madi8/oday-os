import { Sparkles } from 'lucide-react';
import { C, cardShadow } from '../theme';

export function AiAssistant() {
  return (
    <div
      className="rounded-2xl flex flex-col items-center justify-center text-center"
      style={{
        background: C.card,
        border: `1px dashed ${C.border}`,
        boxShadow: cardShadow,
        minHeight: 'calc(100dvh - 10rem)',
      }}
    >
      <span
        className="flex items-center justify-center rounded-2xl mb-3"
        style={{
          width: 44,
          height: 44,
          background: 'linear-gradient(135deg, rgba(167,139,250,0.2) 0%, rgba(99,102,241,0.15) 100%)',
          color: '#6366f1',
        }}
      >
        <Sparkles size={20} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <p className="text-sm" style={{ color: C.inkFaint }}>
        المساعد الذكي
      </p>
    </div>
  );
}
