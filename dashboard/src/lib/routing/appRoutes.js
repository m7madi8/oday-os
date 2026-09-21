const ROUTE_EVENT = 'oday-route-change';

/** @returns {string} */
export function getAppPath() {
  const { hash, pathname } = window.location;
  if (hash && hash.startsWith('#/')) {
    return hash.slice(1).split('?')[0] || '/';
  }
  let path = pathname || '/';
  if (path.endsWith('/index.html')) {
    path = path.replace(/\/index\.html$/, '') || '/';
  }
  return path;
}

/** @returns {URLSearchParams} */
export function getAppSearchParams() {
  const { hash, search } = window.location;
  if (hash && hash.includes('?')) {
    return new URLSearchParams(hash.split('?')[1] || '');
  }
  return new URLSearchParams(search || '');
}

/**
 * @param {string} path
 * @param {{ replace?: boolean, query?: Record<string, string|number|undefined|null> }} [options]
 */
export function navigateApp(path, options = {}) {
  const { replace = false, query } = options;
  let next = path.startsWith('/') ? path : `/${path}`;
  if (query) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      params.set(key, String(value));
    });
    const qs = params.toString();
    if (qs) next += `?${qs}`;
  }

  const useHash = import.meta.env.BASE_URL === './';
  const url = useHash ? `#${next}` : next;

  if (useHash) {
    if (replace) window.history.replaceState({ path: next }, '', url);
    else window.history.pushState({ path: next }, '', url);
  } else if (replace) {
    window.history.replaceState({ path: next }, '', next);
  } else {
    window.history.pushState({ path: next }, '', next);
  }

  window.dispatchEvent(new CustomEvent(ROUTE_EVENT, { detail: { path: next } }));
}

export function subscribeAppRoute(listener) {
  function onPopState() {
    listener(getAppPath(), getAppSearchParams());
  }
  function onCustom(event) {
    listener(event.detail?.path || getAppPath(), getAppSearchParams());
  }
  window.addEventListener('popstate', onPopState);
  window.addEventListener(ROUTE_EVENT, onCustom);
  return () => {
    window.removeEventListener('popstate', onPopState);
    window.removeEventListener(ROUTE_EVENT, onCustom);
  };
}

/**
 * @param {string} path
 * @returns {{ view: 'register' | 'new' | 'detail', id?: string } | null}
 */
export function parseChequeRoute(path) {
  const normalized = (path || '/').replace(/\/+$/, '') || '/';
  if (normalized === '/cheques') return { view: 'register' };
  if (normalized === '/cheques/new') return { view: 'new' };
  const match = normalized.match(/^\/cheques\/([^/]+)$/);
  if (match && match[1] !== 'new') {
    return { view: 'detail', id: decodeURIComponent(match[1]) };
  }
  return null;
}

export function goToChequeList(queryRecord, replace) {
  navigateApp('/cheques', { query: queryRecord, replace });
}

export function goToChequeNew(replace) {
  navigateApp('/cheques/new', { replace });
}

export function goToChequeDetail(id, replace) {
  navigateApp(`/cheques/${encodeURIComponent(id)}`, { replace });
}

export function pageIdFromPath(path) {
  if (parseChequeRoute(path)) return 'checks';
  return null;
}
