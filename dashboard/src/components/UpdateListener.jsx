import { useEffect } from 'react';
import { isDesktop } from '../lib/desktop';
import { showToast } from '../lib/toast';

export function UpdateListener() {
  useEffect(() => {
    if (!isDesktop() || !window.oday?.updates) return undefined;
    const offStatus = window.oday.updates.onStatus?.((payload) => {
      const message = payload?.body || payload?.title;
      if (message) showToast(message, 'ok', 7000);
    });
    const onOnline = () => {
      void window.oday?.updates?.check?.();
    };
    window.addEventListener('online', onOnline);
    void window.oday.updates.check?.();
    return () => {
      offStatus?.();
      window.removeEventListener('online', onOnline);
    };
  }, []);

  return null;
}
