import { api } from '@/lib/api/client';
import { getToken } from '@/lib/auth/session';
import { ENV } from '@/config/env';
import type { DocumentFile, ListResponse } from '@/types/api';

export function listDocuments(params: { page?: number; per_page?: number } = {}) {
  return api<ListResponse<DocumentFile>>('/api/v1/documents', {
    query: { page: params.page ?? 1, per_page: params.per_page ?? 20 },
  });
}

export async function downloadDocument(id: string) {
  const token = await getToken();
  const response = await fetch(`${ENV.apiUrl}/api/v1/documents/${id}/download`, {
    headers: {
      Accept: '*/*',
      'X-API-TOKEN': token ?? '',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
  if (!response.ok) {
    throw new Error('تعذر تنزيل المستند');
  }
  return response;
}

export function addNote(payload: { entity: string; entity_id: string; notes: string }) {
  return api('/api/v1/activities/notes', { method: 'POST', body: payload });
}
