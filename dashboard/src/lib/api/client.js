import { getApiRoot } from '../env';
import { getToken, clearSession, isLocalToken } from '../auth/session';
import { getDesktop, isDesktop } from '../desktop';

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

export function isAuthError(error) {
  if (!error) return false;
  if (typeof error === 'string') {
    return /invalid token|unauthenticated|unauthoriz|expired|انتهت الجلسة|صلاحية/.test(error.toLowerCase());
  }
  if (error.status === 401 || error.status === 403) return true;
  return isAuthError(error.message);
}

let onUnauthorized = null;
const statusListeners = new Set();
let apiOnline = true;

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

export function onApiOnline(listener) {
  statusListeners.add(listener);
  listener(apiOnline);
  return () => statusListeners.delete(listener);
}

export function isApiOnline() {
  return apiOnline;
}

function emitOnline(next) {
  apiOnline = next;
  statusListeners.forEach((listener) => listener(next));
}

function qs(query) {
  if (!query) return '';
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.set(key, String(value));
  });
  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}

async function parseBody(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function firstValidationMessage(errors) {
  if (!errors || typeof errors !== 'object') return '';
  for (const value of Object.values(errors)) {
    if (Array.isArray(value) && value[0]) return String(value[0]);
    if (value) return String(value);
  }
  return '';
}

function errorMessage(json, fallback, status) {
  if (json && typeof json === 'object') {
    const validation = firstValidationMessage(json.errors);
    if (validation) return validation;
    if (json.message) return String(json.message);
    if (json.error) return String(json.error);
  }
  if (typeof json === 'string' && json.trim()) return json.trim();
  if (status === 0) return 'تعذر الاتصال بالخادم. تحقق من تشغيل Laravel على المنفذ 8000.';
  if (status === 503) {
    return 'تعذر الاتصال بقاعدة البيانات. شغّل MySQL على المنفذ 3306 وتحقق من إعدادات DB في .env.';
  }
  if (status >= 500) {
    return 'الخادم غير متاح أو تعذر معالجة الطلب. شغّل Laravel (php artisan serve --port=8000) وقاعدة البيانات.';
  }
  return fallback;
}

export async function api(path, options = {}) {
  const token = options.auth === false ? null : (options.token ?? (await getToken()));
  const headers = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'X-React': 'true',
    ...(options.headers ?? {}),
  };

  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers['X-API-TOKEN'] = token;

  const root = getApiRoot();
  let response;
  try {
    response = await fetch(`${root}${path}${qs(options.query)}`, {
      method: options.method ?? 'GET',
      headers,
      body:
        options.body === undefined
          ? undefined
          : options.body instanceof FormData
            ? options.body
            : JSON.stringify(options.body),
    });
  } catch {
    emitOnline(false);
    throw new ApiError(errorMessage(null, 'تعذر الاتصال بالخادم', 0), 0);
  }

  emitOnline(true);
  const json = await parseBody(response);

  if (response.status === 401 || response.status === 403) {
    if (isLocalToken(token)) {
      return options.emptyAuth ?? null;
    }
    await clearSession();
    onUnauthorized?.();
    if (isDesktop() && response.status === 401) {
      getDesktop()?.notify?.show({ title: 'ODAY OS', body: 'انتهت الجلسة. سجّل الدخول مجدداً.' });
    }
    throw new ApiError(errorMessage(json, 'انتهت الجلسة', response.status), response.status, json);
  }

  if (!response.ok) {
    throw new ApiError(errorMessage(json, 'تعذر إكمال الطلب', response.status), response.status, json);
  }

  return json;
}

export async function apiBlob(path, options = {}) {
  const token = options.auth === false ? null : (options.token ?? (await getToken()));
  const headers = {
    Accept: options.accept || '*/*',
    'X-Requested-With': 'XMLHttpRequest',
    'X-React': 'true',
    ...(options.headers ?? {}),
  };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['X-API-TOKEN'] = token;

  const root = getApiRoot();
  let response;
  try {
    response = await fetch(`${root}${path}${qs(options.query)}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    emitOnline(false);
    throw new ApiError(errorMessage(null, 'تعذر الاتصال بالخادم', 0), 0);
  }

  emitOnline(true);
  if (response.status === 401 || response.status === 403) {
    if (isLocalToken(token)) {
      return new Blob();
    }
    await clearSession();
    onUnauthorized?.();
    throw new ApiError('انتهت الجلسة', response.status);
  }
  if (!response.ok) {
    throw new ApiError('تعذر تنزيل الملف', response.status);
  }
  return response.blob();
}

export async function blobToBase64(blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}
