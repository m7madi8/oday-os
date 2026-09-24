import { AlertCircle, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { isAuthError } from '../../lib/api/client';
import { C, FONT_HEAD, RADIUS } from '../../theme';

const STATUS_META = {
  error: { color: C.burgundy, Icon: AlertCircle },
  warning: { color: C.limeDeep, Icon: AlertTriangle },
  success: { color: C.emerald, Icon: CheckCircle2 },
};

function humanizeSystemMessage(message, status = 'error') {
  const raw = String(message || '').trim();

  if (status === 'success') {
    return { title: raw || 'تم حفظ التغييرات.', detail: '' };
  }

  if (status === 'warning') {
    return { title: raw || 'تنبيه يحتاج مراجعة قبل المتابعة.', detail: '' };
  }

  if (!raw) {
    return { title: 'تعذر تحميل البيانات. أعد المحاولة.', detail: '' };
  }

  if (/invalid|error|exception|failed|network|timeout|500|404/i.test(raw) && !/[\u0600-\u06FF]/.test(raw)) {
    return {
      title: 'حدث خلل غير متوقع. أعد المحاولة، أو سجّل الدخول إن انتهت الجلسة.',
      detail: raw,
    };
  }

  return { title: raw, detail: '' };
}

export function StatusBanner({
  status = 'error',
  message,
  title,
  detail,
  actionLabel = 'إعادة المحاولة',
  onAction,
}) {
  const meta = STATUS_META[status] || STATUS_META.error;
  const copy = title
    ? { title, detail: detail || '' }
    : humanizeSystemMessage(message, status);
  const Icon = meta.Icon;

  return (
    <div className="os-status" style={{ '--status-color': meta.color }} role={status === 'error' ? 'alert' : 'status'}>
      <div className="os-status-copy flex items-start gap-2.5">
        <Icon size={20} strokeWidth={1.5} aria-hidden="true" style={{ color: meta.color, marginTop: 2, flexShrink: 0 }} />
        <div>
          <p className="os-status-title">{copy.title}</p>
          {copy.detail ? <p className="os-status-detail">{copy.detail}</p> : null}
        </div>
      </div>
      {onAction ? (
        <button type="button" className="os-status-action" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export function PrimaryButton({ children, loading, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`os-btn os-btn--primary no-drag disabled:opacity-50 ${className}`}
      {...props}
    >
      {loading ? <Loader2 size={15} strokeWidth={1.5} className="animate-spin" /> : null}
      {children}
    </button>
  );
}

export function GhostButton({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`os-btn os-btn--ghost no-drag ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function EmptyState({ title, body, action }) {
  return (
    <div
      className="os-surface flex flex-col items-center justify-center text-center px-6 py-16"
      style={{
        background: C.card,
        border: `1px dashed ${C.border}`,
        minHeight: '22rem',
        borderRadius: RADIUS.lg,
      }}
    >
      <p className="text-lg" style={{ color: C.ink, fontFamily: FONT_HEAD, fontWeight: 600 }}>
        {title}
      </p>
      {body ? (
        <p className="text-base mt-2 max-w-md" style={{ color: C.inkSoft }}>
          {body}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, error, onRetry }) {
  const payload = error || message;
  if (isAuthError(payload)) return null;

  return (
    <StatusBanner
      status="error"
      message={message}
      actionLabel="إعادة المحاولة"
      onAction={onRetry}
    />
  );
}

export function LoadingBlock() {
  return (
    <div
      className="os-loading-card p-8 flex items-center justify-center gap-2"
      style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: RADIUS.lg }}
    >
      <Loader2 className="os-spin animate-spin" size={15} strokeWidth={1.65} />
      <span className="text-base" style={{ color: C.inkSoft }}>جارٍ التحميل…</span>
    </div>
  );
}
