import { C, money } from '../../theme';
import { chequeStatusLabel } from '../../lib/labels';
import { partyColumnLabel } from '../../lib/cheques/chequeMappers';
import { ChequeDirectionBadge, ChequeStatusIndicator } from './ChequeStatusIndicator';

function Row({ label, value, dir }) {
  if (!value || value === '—') return null;
  return (
    <div className="cheque-essentials__row">
      <span className="cheque-essentials__label">{label}</span>
      <strong className="cheque-essentials__value tabular-nums" dir={dir}>{value}</strong>
    </div>
  );
}

export function ChequeEssentialsPanel({ cheque, hidden, loading, emptyHint }) {
  if (loading) {
    return (
      <div className="cheque-essentials" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <p className="text-sm" style={{ color: C.inkSoft }}>جارِ التحميل…</p>
      </div>
    );
  }

  if (!cheque) {
    return (
      <div className="cheque-essentials" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <p className="text-sm" style={{ color: C.inkSoft }}>{emptyHint || 'اختر شيكًا لعرض التفاصيل.'}</p>
      </div>
    );
  }

  const party = partyColumnLabel(cheque);
  const projectName = cheque.project?.name || cheque.project_name || '';

  return (
    <div className="cheque-essentials" style={{ background: C.card, border: `1px solid ${C.border}` }}>
      <div className="cheque-essentials__head">
        <div>
          <p className="cheque-essentials__title">تفاصيل الشيك</p>
          <p className="cheque-essentials__number tabular-nums" dir="ltr">
            {cheque.cheque_number || cheque.number || '—'}
          </p>
        </div>
        <ChequeDirectionBadge direction={cheque.direction} />
      </div>

      <div className="mb-3">
        <ChequeStatusIndicator status={cheque.status} overdue={cheque.is_overdue} />
        <span className="text-xs ms-2" style={{ color: C.inkFaint }}>
          {chequeStatusLabel(cheque.status)}
        </span>
      </div>

      <div className="cheque-essentials__body">
        <Row label="الجهة" value={party} />
        <Row label="المشروع" value={projectName} />
        <Row label="البنك" value={cheque.bank_name || cheque.bank_label} />
        <Row label="المبلغ" value={money(cheque.amount, hidden)} dir="ltr" />
        <Row label="العملة" value={cheque.currency || cheque.currency_code} dir="ltr" />
        <Row label="تاريخ الإصدار" value={cheque.issue_date} dir="ltr" />
        <Row label="تاريخ الاستحقاق" value={cheque.due_date} dir="ltr" />
        <Row label="الحساب" value={cheque.account_reference} dir="ltr" />
        {cheque.notes ? (
          <div className="cheque-essentials__row cheque-essentials__row--notes">
            <span className="cheque-essentials__label">ملاحظات</span>
            <p className="cheque-essentials__notes">{cheque.notes}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
