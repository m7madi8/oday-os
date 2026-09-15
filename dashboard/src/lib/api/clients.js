import { api } from './client';

export function listClients(params = {}) {
  return api('/api/v1/clients', {
    query: {
      page: params.page ?? 1,
      per_page: params.per_page ?? 50,
      filter: params.filter,
    },
  });
}

export function getClient(id) {
  return api(`/api/v1/clients/${id}`, { query: { include: 'contacts' } });
}

export function createClient(body) {
  return api('/api/v1/clients', { method: 'POST', body });
}

export function updateClient(id, body) {
  return api(`/api/v1/clients/${id}`, { method: 'PUT', body });
}
