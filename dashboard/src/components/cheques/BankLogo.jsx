import { useEffect, useMemo, useState } from 'react';
import {
  bundledBankLogoCandidates,
  datasetLogoUrl,
  officeBankLogoUrl,
} from '../../lib/cheques/bankLogoUrl';

function initials(nameAr, nameEn) {
  const ar = (nameAr || '').trim();
  if (ar.length >= 2) return ar.slice(0, 2);
  const en = (nameEn || '').trim();
  if (en.length >= 2) return en.slice(0, 2).toUpperCase();
  return (ar || en || 'ب').charAt(0);
}

/**
 * @param {{
 *   bank: { id?: string, nameAr?: string, nameEn?: string, logo?: string|null }|null,
 *   officeLogos?: Record<string, { document_id?: string }>,
 *   widthMm: number,
 *   heightMm: number,
 *   zoom?: number,
 *   mode?: 'color' | 'mono',
 *   className?: string,
 * }} props
 */
export function BankLogo({
  bank,
  officeLogos = {},
  widthMm,
  heightMm,
  zoom = 1,
  mode = 'color',
  className = '',
}) {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const candidates = useMemo(() => {
    if (!bank?.id) return [];
    const list = [];
    const office = officeBankLogoUrl(bank.id, officeLogos);
    if (office) list.push(office);
    const fromDataset = datasetLogoUrl(bank);
    if (fromDataset) list.push(fromDataset);
    list.push(...bundledBankLogoCandidates(bank.id));
    return [...new Set(list)];
  }, [bank, officeLogos]);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
    if (!candidates.length) {
      setSrc(null);
      setFailed(true);
      return;
    }
    setSrc(candidates[0]);
  }, [candidates]);

  const boxStyle = {
    width: `calc(${widthMm}mm * ${zoom})`,
    height: `calc(${heightMm}mm * ${zoom})`,
  };

  const monoClass = mode === 'mono' ? 'bank-logo--mono' : '';

  if (!bank) {
    return <div className={`bank-logo-box bank-logo-box--empty ${className}`} style={boxStyle} aria-hidden="true" />;
  }

  function tryNext() {
    const idx = candidates.indexOf(src);
    const next = candidates[idx + 1];
    if (next) {
      setSrc(next);
      setFailed(false);
    } else {
      setSrc(null);
      setFailed(true);
    }
  }

  return (
    <div className={`bank-logo-box ${monoClass} ${className}`} style={boxStyle}>
      {!failed && src ? (
        <img
          src={src}
          alt=""
          className={`bank-logo-img ${loaded ? 'is-loaded' : ''}`}
          onLoad={() => setLoaded(true)}
          onError={tryNext}
        />
      ) : (
        <div className="bank-logo-monogram" aria-hidden="true">
          <span className="bank-logo-monogram-ring">{initials(bank.nameAr, bank.nameEn)}</span>
        </div>
      )}
    </div>
  );
}

export function BankLogoCaption({ bank, zoom = 1 }) {
  if (!bank) return null;
  return (
    <div className="bank-logo-caption" style={{ fontSize: `calc(7.5pt * ${zoom})` }}>
      {bank.nameAr ? <div className="bank-logo-caption-ar">{bank.nameAr}</div> : null}
      {bank.nameEn ? (
        <div className="bank-logo-caption-en" dir="ltr" style={{ unicodeBidi: 'isolate' }}>
          {bank.nameEn}
        </div>
      ) : null}
    </div>
  );
}
