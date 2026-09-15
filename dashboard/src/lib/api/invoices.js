import { api, apiBlob } from './client';

export function listInvoices(params = {}) {
  return api('/api/v1/invoices', {
    query: {
      page: params.page ?? 1,
      per_page: params.per_page ?? 50,
      filter: params.filter,
      client_status: params.client_status,
      client_id: params.client_id,
      project_id: params.project_id,
      include: 'client',
    },
  });
}

export function getInvoice(id) {
  return api(`/api/v1/invoices/${id}`, { query: { include: 'client' } });
}

export function createInvoice(body) {
  return api('/api/v1/invoices', { method: 'POST', body });
}

export function downloadInvoicePdf(id) {
  return apiBlob('/api/v1/invoices/bulk', {
    method: 'POST',
    accept: 'application/pdf',
    body: { action: 'download', ids: [id] },
  });
}
