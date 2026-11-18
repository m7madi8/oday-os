import path from 'node:path';

export function safePdfFileName(name: string | undefined, now = Date.now()) {
  const base = path.basename(String(name || ''));
  const cleaned = base.replace(/[^A-Za-z0-9._-]/g, '');
  if (!cleaned || cleaned === '.' || cleaned === '..') return `oday-${now}.pdf`;
  return cleaned.toLowerCase().endsWith('.pdf') ? cleaned : `${cleaned}.pdf`;
}
