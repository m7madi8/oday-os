export function shouldEndSession(status: number, json: unknown) {
  const record = json && typeof json === 'object' ? (json as { message?: unknown; error?: unknown }) : {};
  const message = String(record.message || '').trim().toLowerCase();
  const error = String(record.error || '').trim().toLowerCase();
  if (status === 403) return message === 'invalid token' || error === 'invalid token';
  if (status === 401) {
    if (message.includes('this action is unauthorized') || message.includes('لا صلاحية')) return false;
    return true;
  }
  return false;
}
