import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowRight, FileText } from 'lucide-react';
import { C, money } from '../../theme';
import { GhostButton, PrimaryButton, LoadingBlock, ErrorState } from '../ui/Actions';
import { ChequeLifecycle } from './ChequeLifecycle';
import { ChequeStatusIndicator, ChequeDirectionBadge } from './ChequeStatusIndicator';
import { TransitionReasonDialog } from './TransitionReasonDialog';
import { ChequeWorkspace } from './ChequeWorkspace';
import { getCheque, transitionCheque } from '../../lib/api/cheques';
import { downloadDocument } from '../../lib/api/documents';
import { invalidateFinance, keys } from '../../lib/query';
import { showToast } from '../../lib/toast';
import { canUser } from '../../lib/permissions';
import { useAuth } from '../../lib/auth/AuthProvider';
import { partyColumnLabel } from '../../lib/cheques/chequeMappers';
import { allowedNextStatuses, isTerminal, requiresReason } from '../../lib/cheques/statusWorkflow';
import { chequeStatusLabel } from '../../lib/labels';
import { goToChequeList } from '../../lib/routing/appRoutes';
import { openOrSaveBlob } from '../../lib/files';

export function ChequeDetailView({ chequeId, hidden, mobileFullScreen, onBack }) {
  const { session } = useAuth();
  const canEdit = canUser(session?.user, 'edit_payment') || canUser(session?.user, 'create_payment');
  const [editing, setEditing] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);

  const query = useQuery({
    queryKey: keys.cheque(chequeId),
    queryFn: () => getCheque(chequeId),
    enabled: Boolean(chequeId),
  });

  const cheque = query.data?.data;

  const transitionMutation = useMutation({
    mutationFn: ({ status, reason }) => transitionCheque(chequeId, { status, reason }),
    onSuccess: async () => {
      await invalidateFinance();
      setPendingStatus(null);
      showToast('تم تحديث حالة الشيك', 'ok');
      query.refetch();
    },
    onError: (error) => showToast(error.message, 'error'),
  });

  async function openAttachment() {
    const id = cheque?.attachment?.id || cheque?.scan_document_id;
    if (!id) return;
    try {
      const blob = await downloadDocument(id);
      await openOrSaveBlob(blob, cheque.attachment?.name || 'cheque-scan');
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  if (query.isLoading) return <LoadingBlock />;
  if (query.isError) return <ErrorState message={query.error?.message} onRetry={() => query.refetch()} />;
  if (!cheque) return <ErrorState message="الشيك غير موجود" onRetry={onBack} />;

  const nextStatuses = allowedNextStatuses(cheque.direction, cheque.status);

  if (editing && !isTerminal(cheque.status)) {
    return (
      <ChequeWorkspace
        mode="edit"
        cheque={cheque}
        hidden={hidden}
        onCancel={() => setEditing(false)}
        onDone={() => {
          setEditing(false);
          query.refetch();
        }}
      />
    );
  }

  return (
    <div className={`cheque-detail space-y-6 min-w-0 max-w-3xl ${mobileFullScreen ? 'pb-24' : ''}`}>
      <header className="flex flex-wrap items-start gap-3 justify-between">
        <div>
          <button
            type="button"
            onClick={onBack || (() => goToChequeList())}
            className="inline-flex items-center gap-1 text-sm mb-2 min-h-11 cursor-pointer"
            style={{ color: C.inkSoft }}
          >
            <ArrowRight size={16} aria-hidden="true" />
            العودة للسجل
          </button>
          <h1 className="text-xl font-semibold flex flex-wrap items-center gap-2" style={{ color: C.ink }}>
            شيك {cheque.cheque_number || cheque.number}
            <ChequeDirectionBadge direction={cheque.direction} />
          </h1>
          <ChequeStatusIndicator status={cheque.status} overdue={cheque.is_overdue} />
        </div>
        <div className="flex flex-wrap gap-2">
          {cheque.attachment?.id || cheque.scan_document_id ? (
            <GhostButton type="button" className="min-h-11" onClick={openAttachment}>
              <FileText size={16} />
              عرض المرفق
            </GhostButton>
          ) : null}
          {canEdit && !isTerminal(cheque.status) ? (
            <GhostButton type="button" className="min-h-11" onClick={() => setEditing(true)}>
              تعديل
            </GhostButton>
          ) : null}
        </div>
      </header>

      <div className="space-y-6 min-w-0">
        <dl className="grid sm:grid-cols-2 gap-3 text-sm os-surface p-4 sm:p-5" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8 }}>
          <Meta label="الجهة" value={partyColumnLabel(cheque)} />
          <Meta label="المشروع" value={cheque.project?.name || '—'} />
          <Meta label="البنك" value={cheque.bank_name || '—'} />
          <Meta label="المبلغ" value={money(cheque.amount, hidden)} dir="ltr" />
          <Meta label="العملة" value={cheque.currency} dir="ltr" />
          <Meta label="تاريخ الإصدار" value={cheque.issue_date || '—'} dir="ltr" />
          <Meta label="تاريخ الاستحقاق" value={cheque.due_date || '—'} dir="ltr" />
          <Meta label="الحساب" value={cheque.account_reference || '—'} dir="ltr" />
          {cheque.notes ? (
            <div className="sm:col-span-2">
              <Meta label="ملاحظات" value={cheque.notes} />
            </div>
          ) : null}
        </dl>

        <ChequeLifecycle cheque={cheque} />

        {canEdit && nextStatuses.length ? (
          <div className="flex flex-wrap gap-2">
            {nextStatuses.map((status) => (
              <PrimaryButton
                key={status}
                type="button"
                className="min-h-11"
                onClick={() => {
                  if (requiresReason(status)) setPendingStatus(status);
                  else transitionMutation.mutate({ status });
                }}
                loading={transitionMutation.isPending}
              >
                {chequeStatusLabel(status)}
              </PrimaryButton>
            ))}
          </div>
        ) : null}
      </div>

      {mobileFullScreen ? (
        <div
          className="fixed inset-x-0 bottom-0 z-30 flex gap-2 p-3 border-t print-hide"
          style={{
            background: C.card,
            borderColor: C.border,
            paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
          }}
        >
          {nextStatuses[0] && canEdit ? (
            <PrimaryButton
              className="flex-1 min-h-11"
              onClick={() => {
                const status = nextStatuses[0];
                if (requiresReason(status)) setPendingStatus(status);
                else transitionMutation.mutate({ status });
              }}
            >
              {chequeStatusLabel(nextStatuses[0])}
            </PrimaryButton>
          ) : null}
        </div>
      ) : null}

      <TransitionReasonDialog
        open={Boolean(pendingStatus)}
        targetStatus={pendingStatus}
        loading={transitionMutation.isPending}
        onCancel={() => setPendingStatus(null)}
        onConfirm={(reason) => transitionMutation.mutate({ status: pendingStatus, reason })}
      />
    </div>
  );
}

function Meta({ label, value, dir }) {
  return (
    <div>
      <dt style={{ color: C.inkFaint }}>{label}</dt>
      <dd className="font-medium tabular-nums" style={{ color: C.ink }} dir={dir}>{value}</dd>
    </div>
  );
}
