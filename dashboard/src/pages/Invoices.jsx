import { FileText } from 'lucide-react';
import { C, cardShadow } from '../theme';

export function Invoices() {
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
        style={{ width: 44, height: 44, background: C.tint, color: C.ink }}
      >
        <FileText size={20} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <p className="text-sm" style={{ color: C.inkFaint }}>
        الفواتير
      </p>
    </div>
  );
}
