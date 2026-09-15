import { getToken, clearSession, isLocalToken } from '../auth/session';
import { getApiRoot } from '../env';
import { desktop, isDesktop } from '../desktop';

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
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

function errorMessage(json, fallback) {
  if (json && typeof json === 'object' && json.message) return String(json.message);
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
    throw new ApiError('تعذر الاتصال بالخادم', 0);
  }

  emitOnline(true);
  const json = await parseBody(response);

  if (response.status === 401 || response.status === 403) {
    if (!isLocalToken(token)) {
      await clearSession();
      onUnauthorized?.();
      if (isDesktop() && response.status === 401) {
        desktop.notify.show({ title: 'ODAY OS', body: 'انتهت الجلسة. سجّل الدخول مجدداً.' });
      }
    }
    throw new ApiError(errorMessage(json, 'انتهت الجلسة'), response.status, json);
  }

  if (!response.ok) {
    throw new ApiError(errorMessage(json, 'تعذر إكمال الطلب'), response.status, json);
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
    throw new ApiError('تعذر الاتصال بالخادم', 0);
  }

  emitOnline(true);
  if (response.status === 401 || response.status === 403) {
    if (!isLocalToken(token)) {
      await clearSession();
      onUnauthorized?.();
    }
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
