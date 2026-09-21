const MAP: Record<string, string> = {
  contract: 'عقد',
  drawing: 'مخطط',
  approval: 'موافقة',
  invoice: 'فاتورة',
  photo: 'صور',
  report: 'تقرير',
  other: 'أخرى',
};

export function categoryLabel(id?: string) {
  if (!id) return 'ملف';
  return MAP[id] || id;
}
