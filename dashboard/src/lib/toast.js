const listeners = new Set();
let current = null;

export function showToast(message, tone = 'info', duration = 3200) {
  current = { id: Date.now(), message, tone, duration };
  listeners.forEach((listener) => listener(current));
}

export function onToast(listener) {
  listeners.add(listener);
  if (current) listener(current);
  return () => listeners.delete(listener);
}

export function hideToast() {
  current = null;
  listeners.forEach((listener) => listener(null));
}
