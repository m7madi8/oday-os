import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { amountToWordsAr } from '../../lib/cheques/amountToWordsAr.js';
import { formatDecimalDisplay } from '../../lib/cheques/money.js';
import { getChequeCurrency } from '../../lib/cheques/currencyConfig.js';
import { isBankChequePrintEnabled } from '../../lib/cheques/templates/registry.js';
import { parseChequeDate } from '../../lib/cheques/parseChequeDate.js';
import { BankLogo, BankLogoCaption } from './BankLogo.jsx';
import './ChequePreview.css';

function fieldStyle(layout, zoom) {
  return {
    left: `calc(${layout.x}mm * ${zoom})`,
    top: `calc(${layout.y}mm * ${zoom})`,
    width: `calc(${layout.w}mm * ${zoom})`,
    minHeight: `calc(${layout.h}mm * ${zoom})`,
    fontSize: `calc(${layout.fontSizePt || 10}pt * ${zoom})`,
    '--field-min-pt': layout.minFontSizePt || 7,
  };
}

function alignClass(align) {
  if (align === 'end') return 'cheque-preview-field--align-end';
  if (align === 'center') return 'cheque-preview-field--align-center';
  return '';
}

function DateBoxes({ iso, zoom }) {
  const p = parseChequeDate(iso);
  if (!p) return null;
  const cell = (val) => (
    <span className="cheque-date-cell" dir="ltr">
      {val}
    </span>
  );
  return (
    <span className="cheque-date-boxes" dir="ltr" data-testid="cheque-date-boxes">
      {cell(p.d)}
      <span className="cheque-date-sep">/</span>
      {cell(p.m)}
      <span className="cheque-date-sep">/</span>
      {cell(p.y)}
    </span>
  );
}

function PayLine({ prefix, payee, layout, zoom }) {
  if (!payee) return null;
  return (
    <div
      className={`cheque-preview-field cheque-pay-line ${alignClass(layout.align)}`}
      style={fieldStyle(layout, zoom)}
    >
      <span className="cheque-label">{prefix}</span>
      <span className="cheque-payee-name" style={{ unicodeBidi: 'isolate' }}>{payee}</span>
      <span className="cheque-filler-rule" aria-hidden="true" />
    </div>
  );
}

function AmountWordsBlock({ prefix, words, layout, zoom, onClamp }) {
  const ref = useRef(null);
  const [clamped, setClamped] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !words) return;
    const minPt = layout.minFontSizePt || 7;
    let pt = layout.fontSizePt || 9;
    el.style.fontSize = `calc(${pt}pt * ${zoom})`;
    const maxH = el.clientHeight;
    while (pt > minPt && el.scrollHeight > maxH + 1) {
      pt -= 0.5;
      el.style.fontSize = `calc(${pt}pt * ${zoom})`;
    }
    const isClamped = el.scrollHeight > maxH + 1 || pt <= minPt;
    setClamped(isClamped);
    onClamp?.(isClamped);
  }, [words, layout, zoom, onClamp]);

  if (!words) return null;

  return (
    <div
      ref={ref}
      className={`cheque-preview-field cheque-amount-words ${alignClass(layout.align)} ${clamped ? 'is-clamped' : ''}`}
      style={fieldStyle(layout, zoom)}
      data-amount-words-clamped={clamped ? 'true' : 'false'}
    >
      <span className="cheque-label">{prefix}</span>
      <span className="cheque-amount-words-text">{words}</span>
      <span className="cheque-filler-rule" aria-hidden="true" />
    </div>
  );
}

/**
 * @param {{
 *   direction: 'incoming' | 'outgoing' | 'in' | 'out',
 *   data: import('../../lib/cheques/previewTypes.js').ChequePreviewData,
 *   template: import('../../lib/cheques/templates/schema.js').ChequeTemplate,
 *   mode: 'screen' | 'print',
 *   printKind?: 'management' | 'bank-paper',
 *   logoMode?: 'color' | 'mono',
 *   officeLogos?: Record<string, { document_id?: string }>,
 *   zoom?: number,
 *   printOffsets?: { xMm?: number, yMm?: number },
 *   showAdministrativeWatermark?: boolean,
 *   onAmountWordsClamp?: (clamped: boolean) => void,
 * }} props
 */
export function ChequePreview({
  direction,
  data,
  template,
  mode = 'screen',
  printKind = 'management',
  logoMode = 'color',
  officeLogos = {},
  zoom = 1,
  printOffsets = { xMm: 0, yMm: 0 },
  showAdministrativeWatermark = false,
  onAmountWordsClamp,
}) {
  const incoming = direction === 'incoming' || direction === 'in';
  const currency = (data.currency || 'ILS').toUpperCase();
  const fields = template.fields || {};
  const labels = template.labels || {};
  const issueIso = data.issueDate || data.date || '';
  const dueIso = data.dueDate || '';
  const showDueNote = dueIso && dueIso !== issueIso;

  const amountDisplay = useMemo(() => {
    if (data.amount == null || data.amount === '') return '';
    try {
      return formatDecimalDisplay(data.amount, currency);
    } catch {
      return '';
    }
  }, [data.amount, currency]);

  const amountWords = useMemo(() => {
    if (data.amount == null || data.amount === '') return '';
    try {
      return amountToWordsAr(data.amount, currency);
    } catch {
      return '';
    }
  }, [data.amount, currency]);

  const currencyMeta = getChequeCurrency(currency);
  const verifiedPrint = isBankChequePrintEnabled(template);
  const bankPaper = mode === 'print' && printKind === 'bank-paper' && verifiedPrint;
  const showAdminMark = incoming || !verifiedPrint || showAdministrativeWatermark;

  const protective =
    !incoming
    && (template.printSettings?.protectiveAsterisksOutgoing !== false)
    && amountDisplay;

  const boxedAmount = protective ? `***${amountDisplay}***` : amountDisplay;

  const offsetX = mode === 'print' ? `${printOffsets.xMm || 0}mm` : '0mm';
  const offsetY = mode === 'print' ? `${printOffsets.yMm || 0}mm` : '0mm';

  const renderStatic = (key, content, { ltr = false, className = '', testId } = {}) => {
    const layout = fields[key];
    if (!layout || !content) return null;
    return (
      <div
        key={key}
        data-testid={testId}
        className={`cheque-preview-field ${alignClass(layout.align)} ${ltr ? 'cheque-preview-field--ltr' : ''} ${className}`}
        style={fieldStyle(layout, zoom)}
        dir={ltr ? 'ltr' : undefined}
      >
        {content}
      </div>
    );
  };

  const logoLayout = fields.bankLogo;
  const namesLayout = fields.bankNames;

  return (
    <div
      className={`cheque-preview-root cheque-preview--${mode} ${bankPaper ? 'cheque-preview--bank-paper' : ''} ${printKind === 'management' ? 'cheque-preview--management-print' : ''}`}
      style={{
        '--cheque-width-mm': template.widthMm,
        '--cheque-height-mm': template.heightMm,
        '--cheque-zoom': zoom,
        '--cheque-font': template.typography?.family,
        '--print-offset-x-mm': offsetX,
        '--print-offset-y-mm': offsetY,
      }}
      aria-hidden="true"
    >
      <div className="cheque-preview-stage">
        <div
          className={`cheque-preview-sheet ${template.mode === 'scan-overlay' && template.scanUrl ? 'has-scan-bg' : ''}`}
          style={
            template.mode === 'scan-overlay' && template.scanUrl && mode === 'screen'
              ? { backgroundImage: `url(${template.scanUrl})` }
              : undefined
          }
        >
          {showAdminMark && !bankPaper ? (
            <div className="cheque-preview-corner-mark">
              {template.printSettings?.administrativeWatermark || 'معاينة إدارية — غير صالحة للصرف'}
            </div>
          ) : null}

          {logoLayout && data.bank && !bankPaper ? (
            <div
              className="cheque-preview-field cheque-bank-block"
              style={fieldStyle(logoLayout, zoom)}
            >
              <BankLogo
                bank={data.bank}
                officeLogos={officeLogos}
                widthMm={logoLayout.w}
                heightMm={logoLayout.h}
                zoom={zoom}
                mode={logoMode}
              />
            </div>
          ) : null}

          {namesLayout && data.bank && !bankPaper ? (
            <div className="cheque-preview-field cheque-bank-names" style={fieldStyle(namesLayout, zoom)}>
              <BankLogoCaption bank={data.bank} zoom={zoom} />
            </div>
          ) : null}

          {renderStatic(
            'chequeNumber',
            data.chequeNumber ? (
              <span>
                <span className="cheque-label">رقم </span>
                <span dir="ltr" className="tabular-nums">{data.chequeNumber}</span>
              </span>
            ) : null,
            { ltr: true },
          )}

          {fields.dateBoxes && issueIso ? (
            <div className="cheque-preview-field cheque-preview-field--ltr" style={fieldStyle(fields.dateBoxes, zoom)} dir="ltr">
              <span className="cheque-label cheque-label-inline">التاريخ </span>
              <DateBoxes iso={issueIso} zoom={zoom} />
            </div>
          ) : null}

          {fields.dueDateNote && showDueNote ? (
            renderStatic(
              'dueDateNote',
              <span>
                <span className="cheque-label">تاريخ الاستحقاق </span>
                <DateBoxes iso={dueIso} zoom={zoom} />
              </span>,
              { ltr: true },
            )
          ) : null}

          {fields.payLine && data.payee ? (
            <PayLine
              prefix={labels.payPrefix || 'اصرفوا لأمر'}
              payee={data.payee}
              layout={fields.payLine}
              zoom={zoom}
            />
          ) : null}

          {fields.amountWords && amountWords ? (
            <AmountWordsBlock
              prefix={labels.amountWordsPrefix || 'مبلغ وقدره'}
              words={amountWords}
              layout={fields.amountWords}
              zoom={zoom}
              onClamp={onAmountWordsClamp}
            />
          ) : null}

          {fields.amountBox && boxedAmount ? (
            <div
              className="cheque-preview-field cheque-amount-box cheque-preview-field--ltr"
              style={fieldStyle(fields.amountBox, zoom)}
              dir="ltr"
            >
              <span className="cheque-currency-label">{currencyMeta.symbol || currency}</span>
              <span className="cheque-amount-value tabular-nums">{boxedAmount}</span>
            </div>
          ) : null}

          {renderStatic('memo', data.memo ? <span><span className="cheque-label">ملاحظة: </span>{data.memo}</span> : null)}
          {renderStatic(
            'account',
            data.accountMasked ? <span><span className="cheque-label">الحساب: </span><span dir="ltr">{data.accountMasked}</span></span> : null,
            { ltr: true },
          )}

          {fields.signature ? (
            <div className="cheque-preview-field cheque-signature" style={fieldStyle(fields.signature, zoom)}>
              <div className="cheque-signature-label">
                {incoming ? (data.drawer ? `المحرر: ${data.drawer}` : 'التوقيع') : 'التوقيع'}
              </div>
              <div className="cheque-signature-baseline" />
            </div>
          ) : null}
        </div>
      </div>
      {incoming && data.scanUrl ? (
        <img src={data.scanUrl} alt="" className="cheque-preview-scan print-hide" />
      ) : null}
    </div>
  );
}

export function ChequePreviewSkeleton() {
  return (
    <div
      className="cheque-preview-skeleton"
      style={{ aspectRatio: '180 / 82' }}
      aria-hidden="true"
    />
  );
}
