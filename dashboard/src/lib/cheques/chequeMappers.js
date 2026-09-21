import { palestinianBanks } from '../../data/palestinianBanks.js';
import { resolveChequeTemplate } from './templates/registry.js';

export function findBankById(bankId) {
  if (!bankId) return null;
  return palestinianBanks.find((b) => b.id === bankId) || null;
}

export function bankFromChequeRow(row) {
  const id = row.bank_id || '';
  const fromRegistry = findBankById(id);
  if (fromRegistry) {
    return {
      id: fromRegistry.id,
      nameAr: fromRegistry.nameAr,
      nameEn: fromRegistry.nameEn,
      verified: fromRegistry.verified,
      logo: fromRegistry.logo,
    };
  }
  if (row.bank_name) {
    return { id: id || '', nameAr: row.bank_name, nameEn: row.bank_name, verified: false, logo: null };
  }
  return null;
}

export function payeeLabel(row) {
  const dir = row.direction;
  if (dir === 'outgoing' || dir === 'out') {
    return row.payee || row.vendor_name || row.drawer || '';
  }
  return row.payee || row.client_name || row.drawer || '';
}

export function partyColumnLabel(row) {
  if (row.direction === 'outgoing' || row.direction === 'out') {
    return row.payee || row.vendor_name || '—';
  }
  return row.client_name || '—';
}

export function mapChequeToPreviewData(row, { scanUrl } = {}) {
  const bank = bankFromChequeRow(row);
  return {
    amount: row.amount ?? '',
    currency: row.currency || row.currency_code || 'ILS',
    payee: payeeLabel(row),
    drawer: row.drawer || '',
    date: row.issue_date || row.due_date || '',
    issueDate: row.issue_date || '',
    dueDate: row.due_date || '',
    chequeNumber: row.cheque_number || row.number || '',
    accountMasked: row.account_reference || '',
    memo: row.notes || '',
    bank,
    scanUrl: scanUrl || '',
  };
}

export function templateForChequeRow(row) {
  return resolveChequeTemplate(bankFromChequeRow(row));
}

export function normalizeListRow(row) {
  return {
    ...row,
    id: row.id,
    direction: row.direction === 'out' ? 'outgoing' : row.direction === 'in' ? 'incoming' : row.direction,
    number: row.cheque_number || row.number,
    cheque_number: row.cheque_number || row.number,
    currency: row.currency || row.currency_code || 'ILS',
    amount: row.amount,
    project_name: row.project?.name || row.project_name || '',
    bank_label: row.bank_name || bankFromChequeRow(row)?.nameAr || '—',
  };
}
