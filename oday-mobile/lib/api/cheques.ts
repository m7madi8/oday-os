import { api } from '@/lib/api/client';
import type { Cheque, ItemResponse, ListResponse } from '@/types/api';

export function listCheques(params: { page?: number; per_page?: number; filter?: string; status?: string } = {}) {
  return api<ListResponse<Cheque>>('/api/oday/mobile/cheques', {
    query: {
      page: params.page ?? 1,
      per_page: params.per_page ?? 20,
      filter: params.filter,
      status: params.status,
    },
  });
}

export function createCheque(body: Record<string, unknown>) {
  return api<ItemResponse<Cheque>>('/api/oday/mobile/cheques', { method: 'POST', body });
}

export function updateCheque(id: string, body: Record<string, unknown>) {
  return api<ItemResponse<Cheque>>(`/api/oday/mobile/cheques/${id}`, { method: 'PUT', body });
}
