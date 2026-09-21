import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchChequePrintCalibration } from '../lib/api/cheques';
import { ChequePreview } from '../components/cheques/ChequePreview';
import { ChequePreviewControls } from '../components/cheques/ChequePreviewControls';
import { palestinianBanks } from '../data/palestinianBanks.js';
import { resolveChequeTemplate, isBankChequePrintEnabled } from '../lib/cheques/templates/registry.js';
import { useChequeA11ySummary } from '../lib/cheques/useChequeA11ySummary.js';
import { printChequeElement } from '../lib/cheques/printCheque.js';
import { C } from '../theme';
import { TextInput } from '../components/settings/Fields';

export function ChequePreviewPlayground({ printCalibration: initialCalibration }) {
  const [printCalibration, setPrintCalibration] = useState(initialCalibration || { offset_x_mm: 0, offset_y_mm: 0 });
  const [direction, setDirection] = useState('outgoing');
  const [amount, setAmount] = useState('25000');
  const [payee, setPayee] = useState('مورد تجريبي');
  const [date, setDate] = useState('2026-09-20');
  const [chequeNumber, setChequeNumber] = useState('1042');
  const [memo, setMemo] = useState('');
  const [bankId, setBankId] = useState('bank-of-palestine');
  const [zoom, setZoom] = useState(1);
  const printRef = useRef(null);

  useEffect(() => {
    if (initialCalibration) return;
    fetchChequePrintCalibration()
      .then((res) => setPrintCalibration(res.data || { offset_x_mm: 0, offset_y_mm: 0 }))
      .catch(() => {});
  }, [initialCalibration]);

  const bank = useMemo(
    () => palestinianBanks.find((b) => b.id === bankId) || palestinianBanks[0],
    [bankId],
  );

  const template = useMemo(() => resolveChequeTemplate(bank), [bank]);

  const data = useMemo(
    () => ({
      amount,
      currency: 'ILS',
      payee,
      date,
      chequeNumber,
      memo,
      accountMasked: '•••• 4821',
      bank,
    }),
    [amount, payee, date, chequeNumber, memo, bank],
  );

  const { summary, onBlur } = useChequeA11ySummary(data);

  const canPrintBank = isBankChequePrintEnabled(template) && direction === 'outgoing';

  const handlePrintAdministrative = () => {
    const node = printRef.current?.querySelector('.cheque-preview-root');
    if (!node) return;
    printChequeElement(node);
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4" style={{ color: C.ink }}>
      <p className="text-sm mb-4" style={{ color: C.inkSoft }}>
        مسار تطوير فقط — لن يظهر في الإنتاج.
      </p>
      <div role="status" aria-atomic="true" className="mb-4 text-sm" style={{ color: C.ink }}>
        {summary}
      </div>
      <div className="grid gap-4 md:grid-cols-2 mb-4">
        <label className="block text-sm">
          الاتجاه
          <select
            className="w-full mt-1 rounded-lg px-3 py-2 min-h-11"
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
          >
            <option value="incoming">وارد</option>
            <option value="outgoing">صادر</option>
          </select>
        </label>
        <label className="block text-sm">
          البنك
          <select
            className="w-full mt-1 rounded-lg px-3 py-2 min-h-11"
            value={bankId}
            onChange={(e) => setBankId(e.target.value)}
          >
            {palestinianBanks.map((b) => (
              <option key={b.id} value={b.id}>{b.nameAr}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">المبلغ
          <TextInput value={amount} onChange={(e) => setAmount(e.target.value)} onBlur={onBlur} className="tabular-nums" />
        </label>
        <label className="block text-sm">المستفيد
          <TextInput value={payee} onChange={(e) => setPayee(e.target.value)} onBlur={onBlur} />
        </label>
        <label className="block text-sm">التاريخ
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} onBlur={onBlur} />
        </label>
        <label className="block text-sm">رقم الشيك
          <TextInput value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} onBlur={onBlur} className="tabular-nums" />
        </label>
      </div>
      <ChequePreviewControls zoom={zoom} onZoom={setZoom} aspectWidth={template.widthMm} aspectHeight={template.heightMm} />
      <div data-cheque-preview-viewport className="cheque-preview-viewport">
        <div ref={printRef}>
          <ChequePreview
            direction={direction}
            data={data}
            template={template}
            mode="screen"
            zoom={zoom}
            showAdministrativeWatermark={!canPrintBank && direction === 'outgoing'}
          />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {canPrintBank ? (
          <button
            type="button"
            className="min-h-11 px-4 rounded-lg"
            style={{ background: C.bronze1, color: '#fff' }}
            onClick={() => {
              const clone = printRef.current?.querySelector('.cheque-preview-root');
              if (!clone) return;
              const printNode = clone.cloneNode(true);
              printNode.classList.add('cheque-preview--print');
              printNode.style.setProperty('--print-offset-x-mm', `${printCalibration.offset_x_mm || 0}mm`);
              printNode.style.setProperty('--print-offset-y-mm', `${printCalibration.offset_y_mm || 0}mm`);
              printChequeElement(printNode);
            }}
          >
            طباعة شيك البنك
          </button>
        ) : (
          <p className="text-sm" style={{ color: C.inkSoft }}>
            {direction === 'outgoing'
              ? 'لا يتوفر قالب بنكي معتمد لهذا البنك — طباعة الشيك الرسمية معطّلة.'
              : 'الشيكات الواردة للمعاينة الإدارية فقط.'}
          </p>
        )}
        <button
          type="button"
          className="min-h-11 px-4 rounded-lg"
          style={{ border: `1px solid ${C.border}`, background: C.card }}
          onClick={handlePrintAdministrative}
        >
          طباعة نسخة إدارية
        </button>
      </div>
    </div>
  );
}
