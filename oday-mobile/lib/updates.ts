import { AppState, Platform } from 'react-native';
import * as Updates from 'expo-updates';

export type OtaSyncResult = {
  fetched: boolean;
  pendingReload: boolean;
};

/** Download a compatible OTA bundle; applies on the next cold start. */
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

export function listenForOtaUpdates(onFetched?: () => void) {
  void syncOtaUpdate().then((result) => {
    if (result.fetched) onFetched?.();
  });

  const sub = AppState.addEventListener('change', (state) => {
    if (state !== 'active') return;
    void syncOtaUpdate().then((result) => {
      if (result.fetched) onFetched?.();
    });
  });

  return () => sub.remove();
}
