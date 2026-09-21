import { api, apiBlob } from './client';

export function listDocuments(params = {}) {
  return api('/api/v1/documents', {
    query: {
      page: params.page ?? 1,
      per_page: params.per_page ?? 50,
      filter: params.filter,
      client_id: params.client_id,
      project_id: params.project_id,
      category: params.category && params.category !== 'all' ? params.category : undefined,
    },
  });
}

export function getDocument(id) {
  return api(`/api/v1/documents/${id}`);
}

export function downloadDocument(id) {
  return apiBlob(`/api/v1/documents/${id}/download`);
}

export function uploadProjectDocument(projectId, file) {
  const body = new FormData();
  body.append('documents[]', file);
  return api(`/api/v1/projects/${projectId}/upload`, {
    method: 'PUT',
    body,
  });
}

export function updateDocumentMeta(id, payload) {
  return api(`/api/v1/documents/${id}`, {
    method: 'PUT',
    body: payload,
  });
}

export function assignDocumentToProject(documentId, projectId) {
  return api(`/api/oday/mobile/documents/${documentId}/assign-project`, {
    method: 'PUT',
    body: { project_id: projectId },
  });
}
