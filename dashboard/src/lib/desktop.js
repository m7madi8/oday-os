export function isDesktop() {
  if (typeof window === 'undefined') return false;
  if (window.oday) return true;
  return /Electron/i.test(navigator.userAgent || '');
}

export const desktop = typeof window !== 'undefined' ? window.oday : undefined;
