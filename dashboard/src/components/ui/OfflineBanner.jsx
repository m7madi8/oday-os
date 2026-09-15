import { useEffect, useState } from 'react';
import { isApiOnline, onApiOnline } from '../../lib/api/client';
import { StatusBanner } from './Actions';

export function OfflineBanner() {
  const [online, setOnline] = useState(isApiOnline);

  useEffect(() => onApiOnline(setOnline), []);

  if (online) return null;

  return (
    <div className="print-hide mb-4">
      <StatusBanner
        status="error"
        title="تعذر الاتصال بالخادم. لن تُحفظ العمليات المالية حتى يعود الاتصال."
        detail="ODAY OS offline"
        actionLabel="إعادة المحاولة"
        onAction={() => window.location.reload()}
      />
    </div>
  );
}
