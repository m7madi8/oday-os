import { api } from './client';

export function listPayments(params = {}) {
  return api('/api/v1/payments', {
    query: {
      page: params.page ?? 1,
      per_page: params.per_page ?? 50,
      filter: params.filter,
      client_id: params.client_id,
      include: 'client',
    },
  });
}

export function createPayment(body) {
  return api('/api/v1/payments', { method: 'POST', body });
}
