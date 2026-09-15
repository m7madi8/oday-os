import { api, apiBlob } from './client';

export function listDocuments(params = {}) {
  return api('/api/v1/documents', {
    query: {
      page: params.page ?? 1,
      per_page: params.per_page ?? 50,
      filter: params.filter,
    },
  });
}

export function downloadDocument(id) {
  return apiBlob(`/api/v1/documents/${id}/download`);
}

export function uploadClientDocument(clientId, file) {
  const body = new FormData();
  body.append('documents[]', file);
  return api(`/api/v1/clients/${clientId}/upload`, {
    method: 'PUT',
    body,
  });
}
