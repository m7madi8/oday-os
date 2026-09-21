export function invoiceStatusLabel(statusId) {
  switch (Number(statusId)) {
    case 1:
      return 'مسودة';
    case 2:
      return 'مرسلة';
    case 3:
      return 'جزئية';
    case 4:
      return 'مدفوعة';
    case 5:
      return 'ملغاة';
    default:
      return 'فاتورة';
  }
}

export function chequeStatusLabel(status) {
  switch (status) {
    case 'received':
    case 'pending':
      return 'مستلم';
    case 'deposited':
      return 'مودع';
    case 'processing':
      return 'قيد التحصيل';
    case 'draft':
      return 'مسودة';
    case 'printed':
      return 'مطبوع';
    case 'delivered':
      return 'مُسلَّم';
    case 'cleared':
      return 'مصروف';
    case 'returned':
    case 'bounced':
      return 'مرتجع';
    case 'cancelled':
      return 'ملغى';
    default:
      return status || '';
  }
}

export function chequeDirectionLabel(direction) {
  if (direction === 'out' || direction === 'outgoing') {
    return 'صادر';
  }
  return 'وارد';
}

export function primaryContact(client) {
  return client?.contacts?.[0];
}

export function entityName(row, fallback = '—') {
  return row?.name || row?.display_name || row?.number || fallback;
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

const MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

export function periodLabel(period) {
  const match = String(period || '').match(/^(\d{4})-(\d{2})$/);
  if (!match) return period || '';
  const month = Number(match[2]);
  return `${MONTHS_AR[month - 1] || match[2]} ${match[1]}`;
}

export function payrollMethodLabel(method) {
  if (method === 'transfer') return 'تحويل';
  if (method === 'cheque') return 'شيك';
  return 'نقد';
}
