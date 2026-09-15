import { Banknote } from 'lucide-react';
import { C, FONT_HEAD, cardShadow } from '../theme';

export function Payroll() {
  return (
    <div
      className="os-surface rounded-2xl flex flex-col items-center justify-center text-center px-6"
      style={{
        background: C.card,
        border: `1px dashed ${C.border}`,
        boxShadow: cardShadow,
        minHeight: 'calc(100dvh - 10rem)',
      }}
    >
      <span
        className="flex items-center justify-center rounded-2xl mb-3"
        style={{ width: 44, height: 44, background: C.tint, color: C.ink }}
      >
        <Banknote size={20} strokeWidth={1.8} />
      </span>
      <h2 className="text-lg font-semibold" style={{ color: C.ink, fontFamily: FONT_HEAD }}>
        الرواتب
      </h2>
      <p className="text-sm mt-2 max-w-md" style={{ color: C.inkSoft }}>
        لا يوجد سجل رواتب مستقل في الخادم حالياً. يمكن تتبع مستحقات الكادر كمصروف مكتبي حتى يُعتمد نموذج الرواتب.
      </p>
    </div>
  );
}
