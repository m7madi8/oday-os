export const DOCUMENT_CATEGORIES = [
  { id: 'contract', label: 'عقد' },
  { id: 'drawing', label: 'مخطط' },
  { id: 'approval', label: 'موافقة' },
  { id: 'invoice', label: 'فاتورة' },
  { id: 'photo', label: 'صور' },
  { id: 'report', label: 'تقرير' },
  { id: 'other', label: 'أخرى' },
];

export function categoryLabel(id) {
  if (!id) return '—';
  return DOCUMENT_CATEGORIES.find((item) => item.id === id)?.label || id;
}
