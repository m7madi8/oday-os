import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Ban,
  Banknote,
  CheckCircle2,
  Circle,
  Clock,
  FileEdit,
  Loader2,
  Printer,
  Truck,
} from 'lucide-react';
import { C } from '../../theme';
import { chequeStatusLabel } from '../../lib/labels';

const ICONS = {
  received: ArrowDownLeft,
  pending: ArrowDownLeft,
  deposited: Banknote,
  processing: Loader2,
  draft: FileEdit,
  printed: Printer,
  delivered: Truck,
  cleared: CheckCircle2,
  returned: AlertCircle,
  bounced: AlertCircle,
  cancelled: Ban,
};

export function ChequeStatusIndicator({ status, overdue, compact = false }) {
  const label = chequeStatusLabel(status);
  const Icon = ICONS[status] || Circle;
  const tone = status === 'cleared'
    ? C.emerald
    : status === 'returned' || status === 'cancelled'
      ? C.burgundy
      : status === 'processing'
        ? C.inkSoft
        : C.ink;

  return (
    <span className="inline-flex items-center gap-1.5 min-h-11" style={{ color: tone }}>
      <Icon size={compact ? 14 : 16} strokeWidth={2} aria-hidden="true" className={status === 'processing' ? 'animate-spin' : ''} />
      <span className={compact ? 'text-sm' : 'text-base'}>{label}</span>
      {overdue ? (
        <span className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: C.burgundy }}>
          <Clock size={14} aria-hidden="true" />
          متأخر
        </span>
      ) : null}
    </span>
  );
}

export function ChequeDirectionBadge({ direction }) {
  const outgoing = direction === 'outgoing' || direction === 'out';
  const Icon = outgoing ? ArrowUpRight : ArrowDownLeft;
  const label = outgoing ? 'صادر' : 'وارد';
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: C.inkSoft }}>
      <Icon size={15} aria-hidden="true" />
      {label}
    </span>
  );
}
