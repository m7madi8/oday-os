import { api } from './client';

export function precheckLogin(email) {
  return api('/api/oday/mobile/login/precheck', {
    method: 'POST',
    auth: false,
    body: { email },
  });
}

export function login(payload) {
  return api('/api/oday/mobile/login', {
    method: 'POST',
    auth: false,
    body: payload,
  });
}

export function logout() {
  return api('/api/oday/mobile/logout', { method: 'POST' });
}

export function fetchSession() {
  return api('/api/oday/mobile/session');
}
