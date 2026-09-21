import { api } from './client';

function listQuery(params = {}) {
  return {
    page: params.page ?? 1,
    per_page: params.per_page ?? 20,
    filter: params.filter || undefined,
    status: params.status || undefined,
    direction: params.direction && params.direction !== 'all' ? params.direction : undefined,
    bank_id: params.bank_id || undefined,
    currency: params.currency || undefined,
    overdue: params.overdue ? '1' : undefined,
    client_id: params.client_id || undefined,
    project_id: params.project_id || undefined,
    sort: params.sort || undefined,
    order: params.order || undefined,
  };
}

export function listCheques(params = {}) {
  const q = listQuery(params);
  return api('/api/v1/cheques', { query: q });
}

export function getCheque(id) {
  return api(`/api/v1/cheques/${id}`);
}

export function createCheque(body) {
  return api('/api/v1/cheques', { method: 'POST', body });
}

export function updateCheque(id, body) {
  return api(`/api/v1/cheques/${id}`, { method: 'PUT', body });
}

export function transitionCheque(id, body) {
  return api(`/api/v1/cheques/${id}/transition`, { method: 'POST', body });
}

export function deleteCheque(id) {
  return api(`/api/v1/cheques/${id}`, { method: 'DELETE' });
}

export function fetchChequeSummary(direction) {
  return api('/api/v1/cheques/summary', {
    query: direction && direction !== 'all' ? { direction } : {},
  });
}

export function fetchChequeInvoiceBalance(invoiceId) {
  return api(`/api/v1/cheques/invoice_balance/${invoiceId}`);
}

export function fetchChequePrintCalibration() {
  return api('/api/v1/cheques/print_calibration');
}

export function saveChequePrintCalibration(body) {
  return api('/api/v1/cheques/print_calibration', { method: 'PUT', body });
}

export function fetchChequeBankLogos() {
  return api('/api/v1/cheques/bank_logos');
}

export function uploadChequeBankLogo(bankId, file) {
  const body = new FormData();
  body.append('bank_id', bankId);
  body.append('logo', file);
  return api('/api/v1/cheques/bank_logos', { method: 'POST', body });
}

export function deleteChequeBankLogo(bankId) {
  return api(`/api/v1/cheques/bank_logos/${encodeURIComponent(bankId)}`, { method: 'DELETE' });
}

export function fetchChequeTemplateOverride(bankId) {
  return api(`/api/v1/cheques/templates/${encodeURIComponent(bankId)}`);
}

export function saveChequeTemplateOverride(bankId, payload) {
  return api(`/api/v1/cheques/templates/${encodeURIComponent(bankId)}`, { method: 'PUT', body: payload });
}

export function verifyChequeTemplateOverride(bankId) {
  return api(`/api/v1/cheques/templates/${encodeURIComponent(bankId)}/verify`, {
    method: 'POST',
    body: { confirmed: true },
  });
}
