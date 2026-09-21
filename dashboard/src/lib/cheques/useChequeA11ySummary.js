import { useEffect, useRef, useState } from 'react';
import { amountToWordsAr } from './amountToWordsAr.js';
import { formatDecimalDisplay } from './money.js';

/**
 * @param {import('./previewTypes.js').ChequePreviewData} data
 */
function buildSummary(data) {
  const parts = [];
  if (data.payee) parts.push(`المستفيد: ${data.payee}`);
  if (data.amount != null && data.amount !== '') {
    const currency = data.currency || 'ILS';
    parts.push(`المبلغ: ${formatDecimalDisplay(data.amount, currency)}`);
    try {
      parts.push(`بالحروف: ${amountToWordsAr(data.amount, currency)}`);
    } catch {
      /* skip invalid partial input */
    }
  }
  if (data.date) parts.push(`التاريخ: ${data.date}`);
  if (data.bank?.nameAr || data.bank?.nameEn) {
    parts.push(`البنك: ${data.bank.nameAr || data.bank.nameEn}`);
  }
  return parts.join(' · ');
}

/**
 * Updates on blur or after debounce — not per keystroke.
 */
export function useChequeA11ySummary(data, { debounceMs = 600 } = {}) {
  const [summary, setSummary] = useState(() => buildSummary(data));
  const timer = useRef(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  const flush = () => setSummary(buildSummary(dataRef.current));

  const onBlur = () => {
    if (timer.current) clearTimeout(timer.current);
    flush();
  };

  const schedule = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, debounceMs);
  };

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    schedule();
  }, [data.amount, data.currency, data.payee, data.date, data.bank?.id, data.bank?.nameAr]);

  return { summary, onBlur, flush };
}
