import { useEffect, useState } from 'react';
import * as Network from 'expo-network';

export function useOffline() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let mounted = true;
    const read = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        if (mounted) setOffline(!(state.isConnected && state.isInternetReachable !== false));
      } catch {
        if (mounted) setOffline(false);
      }
    };
    read();
    const interval = setInterval(read, 8000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return offline;
}

export function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
