import { api } from '@/lib/api/client';
import type { LoginResponse, SessionCompany, SessionUser } from '@/types/api';

export function precheckLogin(email: string) {
  return api<{ methods: string[]; totp_required: boolean }>('/api/oday/mobile/login/precheck', {
    method: 'POST',
    auth: false,
    body: { email },
  });
}

export function login(payload: { email: string; password: string; one_time_password?: string }) {
  return api<LoginResponse>('/api/oday/mobile/login', {
    method: 'POST',
    auth: false,
    body: payload,
  });
}

export function logout() {
  return api<{ message: string }>('/api/oday/mobile/logout', { method: 'POST' });
}

export function fetchSession() {
  return api<{ user: SessionUser; company: SessionCompany }>('/api/oday/mobile/session');
}
