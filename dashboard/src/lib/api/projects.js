import { api } from './client';

export function listProjects(params = {}) {
  return api('/api/v1/projects', {
    query: {
      page: params.page ?? 1,
      per_page: params.per_page ?? 50,
      filter: params.filter,
      include: params.include ?? 'client',
    },
  });
}

export function getProject(id) {
  return api(`/api/v1/projects/${id}`, {
    query: { include: 'client,invoices,documents' },
  });
}

export function createProject(body) {
  return api('/api/v1/projects', { method: 'POST', body });
}

export function updateProject(id, body) {
  return api(`/api/v1/projects/${id}`, { method: 'PUT', body });
}
