import { AppState, Platform } from 'react-native';
import * as Updates from 'expo-updates';

export type OtaSyncResult = {
  fetched: boolean;
  pendingReload: boolean;
};

const FOREGROUND_RECHECK_MS = 5 * 60 * 1000;

/** Download a compatible OTA bundle from Expo (not an app-store install). */
export async function syncOtaUpdate(): Promise<OtaSyncResult> {
  if (__DEV__ || Platform.OS === 'web') {
    return { fetched: false, pendingReload: false };
  }
  if (!Updates.isEnabled) {
    return { fetched: false, pendingReload: false };
  }

  try {
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) {
      return { fetched: false, pendingReload: false };
    }
    await Updates.fetchUpdateAsync();
    return { fetched: true, pendingReload: true };
  } catch {
    return { fetched: false, pendingReload: false };
  }
}

export async function applyPendingOtaUpdate(): Promise<void> {
  if (__DEV__ || Platform.OS === 'web' || !Updates.isEnabled) {
    return;
  }
  try {
    await Updates.reloadAsync();
  } catch {
    // ignore — user keeps current bundle
  }
}

export type ListenForOtaUpdatesOptions = {
  /** When true (default), restart the app as soon as the OTA bundle is downloaded. */
  autoReload?: boolean;
};

export function listenForOtaUpdates(options: ListenForOtaUpdatesOptions = {}) {
  const { autoReload = true } = options;

  const handleResult = (result: OtaSyncResult) => {
    if (!result.pendingReload) return;
    if (autoReload) {
      void applyPendingOtaUpdate();
    }
  };

  void syncOtaUpdate().then(handleResult);

  const sub = AppState.addEventListener('change', (state) => {
    if (state !== 'active') return;
    void syncOtaUpdate().then(handleResult);
  });

  const interval = setInterval(() => {
    if (AppState.currentState !== 'active') return;
    void syncOtaUpdate().then(handleResult);
  }, FOREGROUND_RECHECK_MS);

  return () => {
    sub.remove();
    clearInterval(interval);
  };
}
