import { api } from '@/lib/api/client';
import type { ItemResponse, ListResponse, Payment } from '@/types/api';

export function listPayments(params: { page?: number; per_page?: number; filter?: string; client_id?: string } = {}) {
  return api<ListResponse<Payment>>('/api/v1/payments', {
    query: {
      page: params.page ?? 1,
      per_page: params.per_page ?? 20,
      filter: params.filter,
      client_id: params.client_id,
      include: 'client',
    },
  });
}

export function createPayment(body: Record<string, unknown>) {
  return api<ItemResponse<Payment>>('/api/v1/payments', { method: 'POST', body });
}
