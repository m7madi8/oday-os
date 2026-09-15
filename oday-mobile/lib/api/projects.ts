import { api } from '@/lib/api/client';
import type { ItemResponse, ListResponse, Project } from '@/types/api';

export function listProjects(params: { page?: number; per_page?: number; filter?: string; include?: string } = {}) {
  return api<ListResponse<Project>>('/api/v1/projects', {
    query: {
      page: params.page ?? 1,
      per_page: params.per_page ?? 20,
      filter: params.filter,
      include: params.include ?? 'client',
    },
  });
}

export function getProject(id: string) {
  return api<ItemResponse<Project>>(`/api/v1/projects/${id}`, {
    query: { include: 'client,invoices,documents' },
  });
}

export function createProject(body: Record<string, unknown>) {
  return api<ItemResponse<Project>>('/api/v1/projects', { method: 'POST', body });
}

export function updateProject(id: string, body: Record<string, unknown>) {
  return api<ItemResponse<Project>>(`/api/v1/projects/${id}`, { method: 'PUT', body });
}
