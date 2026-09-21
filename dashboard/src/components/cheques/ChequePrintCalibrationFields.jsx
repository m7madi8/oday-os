import { useEffect, useState } from 'react';
import { fetchChequePrintCalibration, saveChequePrintCalibration } from '../../lib/api/cheques';
import { Field, TextInput } from '../settings/Fields';
import { C } from '../../theme';

export function ChequePrintCalibrationFields() {
  const [offsets, setOffsets] = useState({ offset_x_mm: '0', offset_y_mm: '0' });
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchChequePrintCalibration();
        if (cancelled || !res?.data) return;
        setOffsets({
          offset_x_mm: String(res.data.offset_x_mm ?? 0),
          offset_y_mm: String(res.data.offset_y_mm ?? 0),
        });
      } catch {
        /* defaults */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const save = async () => {
    setStatus('saving');
    try {
      await saveChequePrintCalibration({
        offset_x_mm: Number(offsets.offset_x_mm),
        offset_y_mm: Number(offsets.offset_y_mm),
      });
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="mt-4 rounded-2xl p-4" style={{ background: C.paper, border: `1px solid ${C.border}` }}>
      <h3 className="text-base font-semibold mb-2" style={{ fontFamily: 'var(--font-head)' }}>
        معايرة طباعة الشيكات
      </h3>
      <p className="text-sm mb-3" style={{ color: C.inkSoft }}>
        تُطبَّق الإزاحة بالمليمتر عند الطباعة فقط (من −20 إلى +20).
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="إزاحة X (مم)" htmlFor="cheque-offset-x">
          <TextInput
            id="cheque-offset-x"
            type="number"
            step="0.1"
            min="-20"
            max="20"
            dir="ltr"
            className="tabular-nums text-left"
            value={offsets.offset_x_mm}
            onChange={(e) => setOffsets((o) => ({ ...o, offset_x_mm: e.target.value }))}
          />
        </Field>
        <Field label="إزاحة Y (مم)" htmlFor="cheque-offset-y">
          <TextInput
            id="cheque-offset-y"
            type="number"
            step="0.1"
            min="-20"
            max="20"
            dir="ltr"
            className="tabular-nums text-left"
            value={offsets.offset_y_mm}
            onChange={(e) => setOffsets((o) => ({ ...o, offset_y_mm: e.target.value }))}
          />
        </Field>
      </div>
      <button
        type="button"
        className="mt-3 min-h-11 px-4 rounded-xl text-sm"
        style={{ background: C.bronze1, color: '#fff' }}
        onClick={save}
      >
        حفظ المعايرة
      </button>
      {status === 'saved' ? <p className="text-sm mt-2" style={{ color: C.emerald }}>تم الحفظ</p> : null}
      {status === 'error' ? <p className="text-sm mt-2" style={{ color: C.burgundy }}>تعذر الحفظ</p> : null}
    </div>
  );
}
