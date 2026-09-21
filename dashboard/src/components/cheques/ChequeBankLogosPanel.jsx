import { useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { palestinianBanks } from '../../data/palestinianBanks';
import { C } from '../../theme';
import { SectionCard } from '../settings/Fields';
import { GhostButton, PrimaryButton, LoadingBlock } from '../ui/Actions';
import { BankLogo, BankLogoCaption } from './BankLogo';
import {
  deleteChequeBankLogo,
  fetchChequeBankLogos,
  uploadChequeBankLogo,
} from '../../lib/api/cheques';
import { showToast } from '../../lib/toast';
import { canUser } from '../../lib/permissions';
import { useAuth } from '../../lib/auth/AuthProvider';

export function ChequeBankLogosPanel() {
  const { session } = useAuth();
  const canAdmin = canUser(session?.user, 'edit_payment');
  const fileRef = useRef(null);
  const pendingBank = useRef('');

  const logos = useQuery({
    queryKey: ['cheque-bank-logos'],
    queryFn: fetchChequeBankLogos,
  });

  const uploadMutation = useMutation({
    mutationFn: ({ bankId, file }) => uploadChequeBankLogo(bankId, file),
    onSuccess: () => {
      logos.refetch();
      showToast('تم رفع الشعار', 'ok');
    },
    onError: (e) => showToast(e.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (bankId) => deleteChequeBankLogo(bankId),
    onSuccess: () => {
      logos.refetch();
      showToast('تم حذف الشعار', 'ok');
    },
    onError: (e) => showToast(e.message, 'error'),
  });

  const map = logos.data?.data || {};

  return (
    <SectionCard num="B" title="شعارات البنوك" hint="شعارات المكتب للمعاينة والطباعة الإدارية فقط">
      {logos.isLoading ? <LoadingBlock /> : null}
      <input
        ref={fileRef}
        type="file"
        accept="image/svg+xml,image/png,image/webp,.svg,.png,.webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const bankId = pendingBank.current;
          if (file && bankId) uploadMutation.mutate({ bankId, file });
          e.target.value = '';
        }}
      />
      <ul className="space-y-3">
        {palestinianBanks.map((bank) => (
          <li
            key={bank.id}
            className="flex flex-wrap items-center gap-3 rounded-xl p-3 min-h-11"
            style={{ border: `1px solid ${C.border}`, background: C.card }}
          >
            <BankLogo bank={bank} officeLogos={map} widthMm={18} heightMm={10} zoom={1} />
            <div className="flex-1 min-w-[140px]">
              <BankLogoCaption bank={bank} />
              {map[bank.id] ? (
                <p className="text-xs mt-1" style={{ color: C.emerald }}>شعار مرفوع للمكتب</p>
              ) : (
                <p className="text-xs mt-1" style={{ color: C.inkFaint }}>شعار افتراضي: أحرف أولى</p>
              )}
            </div>
            {canAdmin ? (
              <div className="flex gap-2">
                <PrimaryButton
                  type="button"
                  className="min-h-11"
                  loading={uploadMutation.isPending}
                  onClick={() => {
                    pendingBank.current = bank.id;
                    fileRef.current?.click();
                  }}
                >
                  رفع / استبدال
                </PrimaryButton>
                {map[bank.id] ? (
                  <GhostButton
                    type="button"
                    className="min-h-11"
                    onClick={() => deleteMutation.mutate(bank.id)}
                  >
                    إزالة
                  </GhostButton>
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
