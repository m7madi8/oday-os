import { api } from '@/lib/api/client';
import type { Expense, ItemResponse, ListResponse } from '@/types/api';

export function listExpenses(params: { page?: number; per_page?: number; filter?: string } = {}) {
  return api<ListResponse<Expense>>('/api/v1/expenses', {
    query: {
      page: params.page ?? 1,
      per_page: params.per_page ?? 20,
      filter: params.filter,
    },
  });
}

export function createExpense(body: Record<string, unknown>) {
  return api<ItemResponse<Expense>>('/api/v1/expenses', { method: 'POST', body });
}
