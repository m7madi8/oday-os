import { useState } from 'react';
import { Download } from 'lucide-react';
import { previewReport, startReport } from '../lib/api/reports';
import { C, FONT_HEAD, cardShadow } from '../theme';
import { PrimaryButton } from '../components/ui/Actions';
import { showToast } from '../lib/toast';
import { openOrSaveBlob } from '../lib/files';

const REPORTS = [
  { id: 'invoices', label: 'تقرير الفواتير' },
  { id: 'payments', label: 'تقرير الدفعات' },
  { id: 'expenses', label: 'تقرير المصاريف' },
  { id: 'projects', label: 'تقرير المشاريع' },
  { id: 'clients', label: 'تقرير العملاء' },
  { id: 'profitloss', label: 'الأرباح والخسائر' },
];

const RANGES = [
  { id: 'this_month', label: 'هذا الشهر' },
  { id: 'this_year', label: 'هذه السنة' },
  { id: 'last_year', label: 'السنة الماضية' },
  { id: 'all', label: 'الكل' },
];

export function Reports() {
  const [range, setRange] = useState('this_year');
  const [loadingId, setLoadingId] = useState('');
  const [preview, setPreview] = useState('');

  async function run(type) {
    setLoadingId(type);
    setPreview('');
    try {
      const started = await startReport(type, { date_range: range, output: 'json' });
      const hash = started?.message;
      if (!hash || hash === 'working...') {
        showToast('التقرير يُعالَج على الخادم', 'info');
        return;
      }
      let result = null;
      for (let attempt = 0; attempt < 12; attempt += 1) {
        try {
          result = await previewReport(hash);
          break;
        } catch (error) {
          if (error.status !== 409) throw error;
          await new Promise((resolve) => window.setTimeout(resolve, 700));
        }
      }
      if (result == null) {
        showToast('ما زال التقرير قيد التجهيز على الخادم', 'info');
        return;
      }
      if (typeof result === 'string') {
        const csv = decodeBase64(result);
        setPreview(csv.slice(0, 4000));
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        await openOrSaveBlob(blob, `${type}-${range}.csv`);
      } else {
        const text = JSON.stringify(result, null, 2);
        setPreview(text.slice(0, 4000));
      }
      showToast('تم تجهيز التقرير من الخادم', 'ok');
    } catch (error) {
      showToast(error.message || 'تعذر إنشاء التقرير', 'error');
    } finally {
      setLoadingId('');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {RANGES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setRange(item.id)}
            className="rounded-xl px-4 py-2 text-sm min-h-11"
            style={{
              background: range === item.id ? C.sidebar : C.card,
              color: range === item.id ? C.sidebarTitle : C.ink,
              border: `1px solid ${C.border}`,
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {REPORTS.map((report) => (
          <div key={report.id} className="os-surface rounded-2xl p-5" style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: cardShadow }}>
            <h3 className="font-semibold mb-4" style={{ color: C.ink, fontFamily: FONT_HEAD }}>
              {report.label}
            </h3>
            <PrimaryButton loading={loadingId === report.id} disabled={Boolean(loadingId)} onClick={() => run(report.id)}>
              <Download size={14} />
              استخراج
            </PrimaryButton>
          </div>
        ))}
      </div>
      {preview ? (
        <pre className="rounded-2xl p-4 text-xs overflow-auto" style={{ background: C.card, border: `1px solid ${C.border}`, color: C.inkSoft, maxHeight: 320 }}>
          {preview}
        </pre>
      ) : null}
    </div>
  );
}

function decodeBase64(value) {
  try {
    return decodeURIComponent(escape(atob(value)));
  } catch {
    try {
      return atob(value);
    } catch {
      return value;
    }
  }
}
