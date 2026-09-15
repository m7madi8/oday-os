import { api } from './client';

export function listExpenses(params = {}) {
  return api('/api/v1/expenses', {
    query: {
      page: params.page ?? 1,
      per_page: params.per_page ?? 50,
      filter: params.filter,
    },
  });
}

export function createExpense(body) {
  return api('/api/v1/expenses', { method: 'POST', body });
}
