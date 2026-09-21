import { api } from './client';

export function listEmployees(params = {}) {
  return api('/api/v1/employees', {
    query: {
      page: params.page ?? 1,
      per_page: params.per_page ?? 50,
      filter: params.filter || undefined,
      period: params.period || undefined,
      active: params.active,
    },
  });
}

export function createEmployee(body) {
  return api('/api/v1/employees', { method: 'POST', body });
}

export function updateEmployee(id, body) {
  return api(`/api/v1/employees/${id}`, { method: 'PUT', body });
}

export function deleteEmployee(id) {
  return api(`/api/v1/employees/${id}`, { method: 'DELETE' });
}

export function payEmployee(id, body) {
  return api(`/api/v1/employees/${id}/pay`, { method: 'POST', body });
}

export function listPayrollPayments(params = {}) {
  return api('/api/v1/payroll/payments', {
    query: {
      page: params.page ?? 1,
      per_page: params.per_page ?? 20,
      period: params.period || undefined,
    },
  });
}
