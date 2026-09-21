import { C } from '../../theme';
import { chequeStatusLabel } from '../../lib/labels';
import { statusOrderForDirection, statusesReachedFromHistory } from '../../lib/cheques/statusWorkflow';
import { ChequeStatusIndicator } from './ChequeStatusIndicator';

function formatWhen(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('ar-PS', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export function ChequeLifecycle({ cheque }) {
  const history = [...(cheque.status_history || [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const reached = statusesReachedFromHistory(history);
  const order = statusOrderForDirection(cheque.direction);
  const terminal = ['returned', 'cancelled', 'cleared'];

  const pipeline = order.filter((status) => {
    if (terminal.includes(status) && status !== cheque.status && !reached.has(status)) {
      return false;
    }
    if (!reached.has(status) && status !== cheque.status) {
      return false;
    }
    return reached.has(status) || status === cheque.status;
  });

  return (
    <section className="space-y-4" aria-labelledby="cheque-lifecycle-heading">
      <h2 id="cheque-lifecycle-heading" className="text-base font-semibold" style={{ color: C.ink }}>
        مسار الحالة
      </h2>
      <div className="flex flex-wrap gap-2">
        {pipeline.map((status) => {
          const active = status === cheque.status;
          return (
            <div
              key={status}
              className="rounded-lg px-3 py-2"
              style={{
                background: active ? C.tint : C.card,
                border: `1px solid ${active ? C.ink : C.border}`,
                opacity: reached.has(status) || active ? 1 : 0.45,
              }}
            >
              <ChequeStatusIndicator status={status} compact />
            </div>
          );
        })}
      </div>
      <ol className="space-y-3 border-s-2 ps-4" style={{ borderColor: C.border }}>
        {history.length === 0 ? (
          <li className="text-sm" style={{ color: C.inkSoft }}>لا توجد أحداث مسجّلة بعد الإنشاء.</li>
        ) : (
          history.map((event, index) => (
            <li key={`${event.created_at}-${index}`} className="text-sm">
              <div className="font-medium" style={{ color: C.ink }}>
                {event.old_status ? chequeStatusLabel(event.old_status) : '—'}
                {' → '}
                {chequeStatusLabel(event.new_status)}
              </div>
              <div style={{ color: C.inkFaint }}>{formatWhen(event.created_at)}</div>
              {event.reason ? (
                <div className="mt-1" style={{ color: C.inkSoft }}>{event.reason}</div>
              ) : null}
            </li>
          ))
        )}
      </ol>
    </section>
  );
}
