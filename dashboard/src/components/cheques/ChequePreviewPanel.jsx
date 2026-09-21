import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChequePreview, ChequePreviewSkeleton } from './ChequePreview';
import { ChequePreviewControls } from './ChequePreviewControls';
import { useChequeA11ySummary } from '../../lib/cheques/useChequeA11ySummary';
import { fetchChequeBankLogos } from '../../lib/api/cheques';
import { C } from '../../theme';

export function ChequePreviewPanel({
  direction,
  data,
  template,
  loading = false,
  className = '',
  printKind = 'management',
  logoMode = 'color',
  officeLogos: officeLogosProp,
}) {
  const [zoom, setZoom] = useState(1);
  const [amountClamped, setAmountClamped] = useState(false);
  const { summary, onBlurCapture } = useChequeA11ySummary(data);

  const logosQuery = useQuery({
    queryKey: ['cheque-bank-logos'],
    queryFn: fetchChequeBankLogos,
    enabled: !officeLogosProp,
  });

  const officeLogos = officeLogosProp || logosQuery.data?.data || {};

  if (loading) {
    return (
      <div className={className}>
        <ChequePreviewSkeleton />
      </div>
    );
  }

  const aspectW = template?.widthMm || 180;
  const aspectH = template?.heightMm || 82;

  return (
    <div className={className} onBlurCapture={onBlurCapture}>
      <p className="sr-only" role="status" aria-atomic="true">{summary}</p>
      {amountClamped ? (
        <p className="text-sm mb-2 rounded-lg px-3 py-2" style={{ background: C.burgundySoft, color: C.burgundy }} role="alert">
          مبلغ الحروف طويل جداً للمساحة — راجع الصياغة أو المبلغ.
        </p>
      ) : null}
      <ChequePreviewControls zoom={zoom} onZoom={setZoom} aspectWidth={aspectW} aspectHeight={aspectH} />
      <ChequePreview
        direction={direction}
        data={data}
        template={template}
        mode="screen"
        printKind={printKind}
        logoMode={logoMode}
        officeLogos={officeLogos}
        zoom={zoom}
        showAdministrativeWatermark={direction === 'outgoing' || direction === 'out'}
        onAmountWordsClamp={setAmountClamped}
      />
    </div>
  );
}
