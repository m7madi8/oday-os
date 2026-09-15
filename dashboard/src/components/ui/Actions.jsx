import { AlertCircle, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { C, FONT_HEAD, RADIUS } from '../../theme';

const STATUS_META = {
  error: { color: 'var(--danger-500)', Icon: AlertCircle },
  warning: { color: 'var(--gold-600)', Icon: AlertTriangle },
  success: { color: 'var(--success-500)', Icon: CheckCircle2 },
};

function humanizeSystemMessage(message, status = 'error') {
  const raw = String(message || '').trim();
  const blob = raw.toLowerCase();
  const expired = /token|unauthenticated|unauthoriz|401|expired|جلسة|صلاحية/.test(blob);

  if (status === 'error' && expired) {
    return {
      title: 'انتهت صلاحية الجلسة. سجّل الدخول من جديد للمتابعة.',
      detail: raw && !/انتهت صلاحية/.test(raw) ? raw : '',
    };
  }

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
      className={`no-drag inline-flex items-center justify-center gap-2 px-4 py-2.5 text-base min-h-11 disabled:opacity-50 ${className}`}
      style={{ background: 'var(--black-950)', color: 'var(--paper-50)', borderRadius: RADIUS.md }}
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
      className={`no-drag inline-flex items-center justify-center gap-2 px-4 py-2.5 text-base min-h-11 ${className}`}
      style={{ background: 'var(--paper-50)', border: '1px solid var(--paper-200)', color: 'var(--black-950)', borderRadius: RADIUS.md }}
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
        borderRadius: RADIUS.md,
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

export function ErrorState({ message, onRetry }) {
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
      style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: RADIUS.md }}
    >
      <Loader2 className="os-spin animate-spin" size={15} strokeWidth={2.2} />
      <span className="text-base" style={{ color: C.inkSoft }}>جارٍ التحميل…</span>
    </div>
  );
}
