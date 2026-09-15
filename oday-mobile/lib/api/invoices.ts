import { api } from '@/lib/api/client';
import type { Invoice, ItemResponse, ListResponse } from '@/types/api';

export function listInvoices(params: { page?: number; per_page?: number; filter?: string; client_status?: string; client_id?: string; project_id?: string } = {}) {
  return api<ListResponse<Invoice>>('/api/v1/invoices', {
    query: {
      page: params.page ?? 1,
      per_page: params.per_page ?? 20,
      filter: params.filter,
      client_status: params.client_status,
      client_id: params.client_id,
      project_id: params.project_id,
      include: 'client',
    },
  });
}

export function getInvoice(id: string) {
  return api<ItemResponse<Invoice>>(`/api/v1/invoices/${id}`, { query: { include: 'client' } });
}

export function createInvoice(body: Record<string, unknown>) {
  return api<ItemResponse<Invoice>>('/api/v1/invoices', { method: 'POST', body });
}
