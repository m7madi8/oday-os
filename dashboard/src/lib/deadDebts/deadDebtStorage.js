import { getItem, setItem } from '../storage';

export const DEAD_DEBTS_STORAGE_KEY = 'dead-debts-v1';

function parseList(raw) {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function loadDeadDebts() {
  const res = await getItem(DEAD_DEBTS_STORAGE_KEY);
  return parseList(res?.value);
}

export async function saveDeadDebts(rows) {
  await setItem(DEAD_DEBTS_STORAGE_KEY, JSON.stringify(rows));
  return rows;
}

export function createDeadDebtId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `dd-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeDeadDebt(row) {
  return {
    id: row.id || createDeadDebtId(),
    client_name: String(row.client_name || '').trim(),
    amount: Number(row.amount) || 0,
    debt_year: row.debt_year ? String(row.debt_year) : '',
    notes: String(row.notes || '').trim(),
    created_at: Number(row.created_at) || Date.now(),
    updated_at: Date.now(),
  };
}
