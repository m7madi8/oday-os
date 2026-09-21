import { useState } from 'react';
import { C } from '../../theme';
import { GhostButton, PrimaryButton } from '../ui/Actions';
import { TextArea } from '../settings/Fields';
import { chequeStatusLabel } from '../../lib/labels';

export function TransitionReasonDialog({ open, targetStatus, onConfirm, onCancel, loading }) {
  const [reason, setReason] = useState('');

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'color-mix(in srgb, var(--c-ink) 40%, transparent)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cheque-transition-title"
    >
      <div
        className="w-full max-w-md rounded-2xl p-5 space-y-4"
        style={{ background: C.card, border: `1px solid ${C.border}` }}
      >
        <h2 id="cheque-transition-title" className="text-lg font-semibold" style={{ color: C.ink }}>
          {chequeStatusLabel(targetStatus)}
        </h2>
        <p className="text-sm" style={{ color: C.inkSoft }}>
          يرجى توضيح سبب هذا الانتقال. الحقل مطلوب للشيكات الملغاة أو المرتجعة.
        </p>
        <label className="block">
          <span className="block text-sm mb-1.5" style={{ color: C.inkSoft }}>السبب</span>
          <TextArea
            id="cheque-transition-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            aria-required="true"
          />
        </label>
        <div className="flex flex-wrap gap-2 justify-end">
          <GhostButton type="button" onClick={onCancel} className="min-h-11 min-w-11">
            إلغاء
          </GhostButton>
          <PrimaryButton
            type="button"
            loading={loading}
            disabled={!reason.trim()}
            onClick={() => onConfirm(reason.trim())}
            className="min-h-11"
          >
            تأكيد
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
