import { useEffect } from 'react';
import { listenForOtaUpdates } from '@/lib/updates';

/** Background OTA check + automatic apply after download (no store APK, no prompt). */
export function UpdateListener() {
  useEffect(() => {
    return listenForOtaUpdates({ autoReload: true });
  }, []);

  return null;
}
