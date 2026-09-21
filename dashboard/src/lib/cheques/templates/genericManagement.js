/** @type {import('./schema.js').ChequeTemplate} */
export const genericManagementTemplate = {
  id: 'generic-management',
  bankId: null,
  nameAr: 'شيك إداري عام',
  widthMm: 180,
  heightMm: 82,
  verified: false,
  mode: 'standard',
  source: 'ODAY OS — generic 180×82 mm management layout (not bank-certified)',
  typography: {
    family: "'IBM Plex Sans Arabic', 'Noto Sans Arabic', sans-serif",
    basePt: 9.5,
  },
  logo: null,
  offsets: { xMm: 0, yMm: 0 },
  labels: {
    payPrefix: 'اصرفوا لأمر',
    amountWordsPrefix: 'مبلغ وقدره',
  },
  printSettings: {
    marginMm: 0,
    administrativeWatermark: 'معاينة إدارية — غير صالحة للصرف',
    protectiveAsterisksOutgoing: true,
  },
  fields: {
    bankLogo: { x: 6, y: 5, w: 38, h: 14, fontSizePt: 9, align: 'start' },
    bankNames: { x: 6, y: 19, w: 52, h: 8, fontSizePt: 7.5, align: 'start' },
    chequeNumber: { x: 128, y: 5, w: 46, h: 6, fontSizePt: 9, align: 'end' },
    dateBoxes: { x: 108, y: 12, w: 66, h: 8, fontSizePt: 9, align: 'end' },
    dueDateNote: { x: 108, y: 21, w: 66, h: 5, fontSizePt: 7, align: 'end' },
    payLine: { x: 6, y: 28, w: 168, h: 10, fontSizePt: 11, align: 'start', minFontSizePt: 9 },
    amountWords: { x: 6, y: 40, w: 118, h: 16, fontSizePt: 9, align: 'start', minFontSizePt: 7 },
    amountBox: { x: 128, y: 38, w: 46, h: 14, fontSizePt: 11, align: 'center' },
    memo: { x: 6, y: 58, w: 90, h: 6, fontSizePt: 8, align: 'start' },
    account: { x: 6, y: 65, w: 90, h: 6, fontSizePt: 8, align: 'start' },
    signature: { x: 108, y: 66, w: 66, h: 12, fontSizePt: 8, align: 'end' },
  },
};
