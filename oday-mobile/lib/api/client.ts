import { getApiUrl } from '@/lib/server';
import { clearSession, getToken } from '@/lib/auth/session';
import { isLocalToken } from '@/lib/auth/office';
export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  auth?: boolean;
};

function qs(query?: RequestOptions['query']) {
  if (!query) return '';
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.set(key, String(value));
  });
  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = options.auth === false ? null : (options.token ?? (await getToken()));
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'X-React': 'true',
    ...(options.headers ?? {}),
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['X-API-TOKEN'] = token;
  }

  let response: Response;
  try {
    response = await fetch(`${getApiUrl()}${path}${qs(options.query)}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError('تعذر الاتصال بالخادم. تحقق من عنوان الخادم والشبكة.', 0);
  }

  const text = await response.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { message: text };
    }
  }

  if (response.status === 401 || response.status === 403) {
    if (isLocalToken(token)) {
      return (options.emptyAuth ?? null) as T;
    }
    await clearSession();
    onUnauthorized?.();    const message =
      typeof json === 'object' && json && 'message' in json
        ? String((json as { message: string }).message)
        : 'انتهت الجلسة';
    throw new ApiError(message, response.status, json);
  }

  if (!response.ok) {
    const message =
      typeof json === 'object' && json && 'message' in json
        ? String((json as { message: string }).message)
        : 'تعذر إكمال الطلب';
    throw new ApiError(message, response.status, json);
  }

  return json as T;
}

export function invoiceStatusLabel(statusId?: number) {
  switch (statusId) {
    case 1:
      return 'مسودة';
    case 2:
      return 'مرسلة';
    case 3:
      return 'جزئية';
    case 4:
      return 'مدفوعة';
    case 5:
      return 'ملغاة';
    default:
      return 'فاتورة';
  }
}

export function chequeStatusLabel(status?: string) {
  switch (status) {
    case 'received':
    case 'pending':
      return 'مستلم';
    case 'deposited':
      return 'مودع';
    case 'processing':
      return 'قيد التحصيل';
    case 'draft':
      return 'مسودة';
    case 'printed':
      return 'مطبوع';
    case 'delivered':
      return 'مُسلَّم';
    case 'cleared':
      return 'مصروف';
    case 'returned':
    case 'bounced':
      return 'مرتجع';
    case 'cancelled':
      return 'ملغى';
    default:
      return status || '';
  }
}

export function projectFinance(project: { budgeted_amount?: number; invoices?: { amount: number; balance: number }[] }) {
  const invoices = project.invoices ?? [];
  const invoiced = invoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  const remaining = invoices.reduce((sum, invoice) => sum + Number(invoice.balance || 0), 0);
  const value = Number(project.budgeted_amount || 0) || invoiced;
  const paid = Math.max(invoiced - remaining, 0);
  return { value, paid, remaining: remaining || Math.max(value - paid, 0) };
}

export function primaryContact(client?: { contacts?: { email?: string; phone?: string; first_name?: string }[] }) {
  return client?.contacts?.[0];
}
