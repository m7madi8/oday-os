export function isDesktop() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.oday?.store);
}

export function getDesktop() {
  return typeof window !== 'undefined' ? window.oday : undefined;
}

/** @deprecated Prefer getDesktop() so the bridge is read at call time. */
export const desktop = typeof window !== 'undefined' ? window.oday : undefined;
