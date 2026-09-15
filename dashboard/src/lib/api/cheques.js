import { api } from './client';

export function listCheques(params = {}) {
  return api('/api/oday/mobile/cheques', {
    query: {
      page: params.page ?? 1,
      per_page: params.per_page ?? 50,
      filter: params.filter,
      status: params.status,
    },
  });
}

export function createCheque(body) {
  return api('/api/oday/mobile/cheques', { method: 'POST', body });
}

export function updateCheque(id, body) {
  return api(`/api/oday/mobile/cheques/${id}`, { method: 'PUT', body });
}
