import { api } from './client';

export function startReport(type, payload = {}) {
  return api(`/api/v1/reports/${type}`, {
    method: 'POST',
    body: {
      date_range: payload.date_range || 'this_year',
      report_keys: payload.report_keys || [],
      send_email: false,
      include_deleted: false,
      output: payload.output || 'json',
    },
  });
}

export function previewReport(hash) {
  return api(`/api/v1/reports/preview/${hash}`, { method: 'POST' });
}
