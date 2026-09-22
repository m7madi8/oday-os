import { Sparkles } from 'lucide-react';
import { C, FONT_BODY, FONT_HEAD, RADIUS, cardShadow } from '../theme';
import { BrandLogo } from '../components/BrandLogo';

export function AiAssistant() {
  return (
    <div
      className="os-surface flex flex-col items-center justify-center text-center px-6 py-16"
      style={{
        background: C.card,
        border: `1px dashed ${C.border}`,
        boxShadow: cardShadow,
        borderRadius: RADIUS.md,
        minHeight: 'calc(100dvh - 10rem)',
      }}
    >
      <span
        className="flex items-center justify-center mb-4"
        style={{
          width: 52,
          height: 52,
          background: C.tint,
          color: C.lime,
          borderRadius: RADIUS.md,
        }}
      >
        <Sparkles size={24} strokeWidth={1.5} aria-hidden="true" />
      </span>
      <h2 className="text-lg mb-1" style={{ color: C.ink, fontFamily: FONT_HEAD, fontWeight: 600 }}>
        مساعد AI
      </h2>
      <p className="text-sm max-w-sm" style={{ color: C.inkSoft, fontFamily: FONT_BODY }}>
        يتوفر قريبًا
      </p>
      <BrandLogo
        variant="mark"
        decorative
        className="mt-8"
        style={{ height: 28, width: 'auto', opacity: 0.28 }}
      />
    </div>
  );
}
