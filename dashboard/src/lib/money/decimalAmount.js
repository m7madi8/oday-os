export function parseDecimalAmount(raw, scale = 6) {
  const text = String(raw ?? '').trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  const [wholeRaw, fraction = ''] = text.split('.');
  if (fraction.length > scale) return null;
  const whole = wholeRaw.replace(/^0+(?=\d)/, '') || '0';
  const normalized = fraction === '' ? whole : `${whole}.${fraction}`;
  if (/^0+(\.0+)?$/.test(normalized)) return null;
  return normalized;
}
