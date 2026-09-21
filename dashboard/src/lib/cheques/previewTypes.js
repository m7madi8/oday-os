/**
 * @typedef {Object} ChequePreviewBank
 * @property {string} [id]
 * @property {string} [nameAr]
 * @property {string} [nameEn]
 * @property {boolean} [verified]
 * @property {string|null} [logo]
 */

/**
 * @typedef {Object} ChequePreviewData
 * @property {string|number} [amount]
 * @property {string} [currency]
 * @property {string} [payee]
 * @property {string} [drawer]
 * @property {string} [date]
 * @property {string} [issueDate]
 * @property {string} [dueDate]
 * @property {string} [chequeNumber]
 * @property {string} [accountMasked]
 * @property {string} [memo]
 * @property {ChequePreviewBank|null} [bank]
 * @property {string} [scanUrl]
 */

export {};
