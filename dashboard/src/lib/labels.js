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
    case 'pending':
      return 'معلّق';
    case 'deposited':
      return 'مودع';
    case 'cleared':
      return 'مقبوض';
    case 'bounced':
      return 'مرتجع';
    case 'cancelled':
      return 'ملغى';
    default:
      return status || '';
  }
}

export function chequeDirectionLabel(direction) {
  return direction === 'out' ? 'صادر' : 'وارد';
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
