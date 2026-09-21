/**
 * @typedef {'start' | 'center' | 'end'} FieldAlign
 */

/**
 * @typedef {Object} ChequeFieldLayout
 * @property {number} x
 * @property {number} y
 * @property {number} w
 * @property {number} h
 * @property {number} [fontSizePt]
 * @property {number} [minFontSizePt]
 * @property {FieldAlign} [align]
 */

/**
 * @typedef {'standard' | 'scan-overlay'} ChequeTemplateMode
 */

/**
 * @typedef {Object} ChequeTemplate
 * @property {string} id
 * @property {string|null} bankId
 * @property {string} [nameAr]
 * @property {number} widthMm
 * @property {number} heightMm
 * @property {boolean} verified
 * @property {string} source
 * @property {{ family: string, basePt: number }} typography
 * @property {string|null} [logo]
 * @property {{ xMm: number, yMm: number }} offsets
 * @property {{ marginMm: number, administrativeWatermark?: string, protectiveAsterisksOutgoing?: boolean }} printSettings
 * @property {Record<string, ChequeFieldLayout>} fields
 * @property {{ payPrefix?: string, amountWordsPrefix?: string }} [labels]
 * @property {ChequeTemplateMode} [mode]
 * @property {string} [scanDocumentId]
 * @property {string} [scanUrl]
 */

export {};
