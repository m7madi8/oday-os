import { genericManagementTemplate } from './genericManagement.js';

/** @type {Record<string, import('./schema.js').ChequeTemplate>} */
export const bankTemplates = {
  // Bank-specific bundled templates require owner mm measurements.
};

/**
 * @param {import('./schema.js').ChequeTemplate|null|undefined} officeOverride
 * @returns {import('./schema.js').ChequeTemplate|null}
 */
export function officeScanTemplate(officeOverride) {
  if (!officeOverride?.fields || !officeOverride.width_mm) return null;
  return {
    id: `office-${officeOverride.bank_id}`,
    bankId: officeOverride.bank_id,
    nameAr: 'قالب مكتب — مسح ضوئي',
    widthMm: officeOverride.width_mm,
    heightMm: officeOverride.height_mm,
    verified: Boolean(officeOverride.verified),
    mode: 'scan-overlay',
    source: 'Office scan-overlay template',
    typography: genericManagementTemplate.typography,
    logo: null,
    offsets: { xMm: 0, yMm: 0 },
    labels: genericManagementTemplate.labels,
    printSettings: genericManagementTemplate.printSettings,
    fields: officeOverride.fields,
    scanDocumentId: officeOverride.scan_document_id || '',
    scanUrl: officeOverride.scan_url || '',
  };
}

/**
 * @param {{ id?: string, verified?: boolean }|null|undefined} bank
 * @param {object|null} [officeOverride]
 * @returns {import('./schema.js').ChequeTemplate}
 */
export function resolveChequeTemplate(bank, officeOverride = null) {
  const scan = officeScanTemplate(officeOverride);
  if (scan) return scan;

  if (bank?.id && bank.verified) {
    const specific = bankTemplates[bank.id];
    if (specific?.verified) return specific;
  }
  return genericManagementTemplate;
}

export function isBankChequePrintEnabled(template) {
  return Boolean(template?.verified);
}

export { genericManagementTemplate };
