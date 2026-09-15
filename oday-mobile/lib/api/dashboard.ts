import { api } from '@/lib/api/client';
import type { OfficeSettings, Overview } from '@/types/api';

export function fetchOverview() {
  return api<Overview>('/api/oday/mobile/overview');
}

export function fetchOfficeSettings() {
  return api<{ settings: OfficeSettings; updated_at?: number }>('/api/oday/mobile/office-settings');
}
