/**
 * @param {string} iso YYYY-MM-DD
 */
export function parseChequeDate(iso) {
  if (!iso || typeof iso !== 'string') return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return { y: m[1], m: m[2], d: m[3] };
}

export function formatDateBoxes(iso) {
  const p = parseChequeDate(iso);
  if (!p) return null;
  return p;
}
