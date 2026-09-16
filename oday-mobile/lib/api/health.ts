import { getApiUrl } from '@/lib/server';

export async function pingServer(baseUrl?: string) {
  const root = normalizeBase(baseUrl ?? getApiUrl());
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${root}/api/oday/mobile/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) {
      return { ok: false, message: 'الخادم لا يستجيب' };
    }
    const json = await response.json().catch(() => null);
    return { ok: true, message: json?.message ?? 'متصل' };
  } catch {
    return { ok: false, message: 'تعذر الاتصال بالخادم. تحقق من العنوان والشبكة.' };
  } finally {
    clearTimeout(timer);
  }
}

function normalizeBase(value: string) {
  return value.replace(/\/$/, '');
}
