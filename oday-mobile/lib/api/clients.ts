import { api } from '@/lib/api/client';
import type { Client, ItemResponse, ListResponse } from '@/types/api';

export function listClients(params: { page?: number; per_page?: number; filter?: string } = {}) {
  return api<ListResponse<Client>>('/api/v1/clients', {
    query: {
      page: params.page ?? 1,
      per_page: params.per_page ?? 20,
      filter: params.filter,
    },
  });
}

export function getClient(id: string) {
  return api<ItemResponse<Client>>(`/api/v1/clients/${id}`);
}

export function createClient(body: Record<string, unknown>) {
  return api<ItemResponse<Client>>('/api/v1/clients', { method: 'POST', body });
}

export function updateClient(id: string, body: Record<string, unknown>) {
  return api<ItemResponse<Client>>(`/api/v1/clients/${id}`, { method: 'PUT', body });
}

export function clientStatement(clientId: string) {
  return api<Blob | Record<string, unknown>>('/api/v1/client_statement', {
    method: 'POST',
    body: { client_id: clientId },
  });
}
