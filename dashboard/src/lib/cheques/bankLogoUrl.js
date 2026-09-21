const EXTENSIONS = ['svg', 'png', 'webp'];

/**
 * Bundled static path candidates (owner files in dashboard/public/bank-logos).
 * @param {string} bankId
 * @returns {string[]}
 */
export function bundledBankLogoCandidates(bankId) {
  if (!bankId) return [];
  const base = import.meta.env.BASE_URL || '/';
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return EXTENSIONS.map((ext) => `${prefix}bank-logos/${bankId}.${ext}`);
}

/**
 * @param {string} bankId
 * @param {Record<string, { document_id?: string }>} officeLogos
 * @returns {string|null}
 */
export function officeBankLogoUrl(bankId, officeLogos = {}) {
  const entry = officeLogos[bankId];
  if (!entry?.document_id) return null;
  return `/api/v1/documents/${entry.document_id}/download?inline=true`;
}

/**
 * @param {{ logo?: string|null }} bank
 */
export function datasetLogoUrl(bank) {
  if (!bank?.logo) return null;
  if (bank.logo.startsWith('http') || bank.logo.startsWith('/')) return bank.logo;
  const base = import.meta.env.BASE_URL || '/';
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}${bank.logo.replace(/^\//, '')}`;
}
