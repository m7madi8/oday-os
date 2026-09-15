import { api } from './client';

export function fetchOverview() {
  return api('/api/oday/mobile/overview');
}

export function fetchOfficeSettings() {
  return api('/api/oday/mobile/office-settings');
}

export function saveOfficeSettingsApi(settings) {
  return api('/api/oday/mobile/office-settings', {
    method: 'PUT',
    body: { settings, updated_at: Date.now() },
  });
}
