import { AppState, Platform } from 'react-native';
import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';

onlineManager.setEventListener((setOnline) => {
  const tick = async () => {
    try {
      const state = await Network.getNetworkStateAsync();
      setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    } catch {
      setOnline(true);
    }
  };
  void tick();
  const timer = setInterval(() => void tick(), 8000);
  return () => clearInterval(timer);
});

focusManager.setEventListener((handleFocus) => {
  if (Platform.OS === 'web') return () => undefined;
  const sub = AppState.addEventListener('change', (status) => {
    handleFocus(status === 'active');
  });
  return () => sub.remove();
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 3_000,
      gcTime: 30 * 60_000,
      retry: 1,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
      refetchInterval: 5_000,
      refetchIntervalInBackground: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const keys = {
  overview: ['overview'] as const,
  office: ['office-settings'] as const,
  session: ['session'] as const,
  projects: (filter = '') => ['projects', filter] as const,
  project: (id: string) => ['project', id] as const,
  clients: (filter = '') => ['clients', filter] as const,
  client: (id: string) => ['client', id] as const,
  invoices: (filter = '') => ['invoices', filter] as const,
  payments: (filter = '') => ['payments', filter] as const,
  expenses: (filter = '') => ['expenses', filter] as const,
  cheques: (filter = '') => ['cheques', filter] as const,
  documents: ['documents'] as const,
};

export function invalidateFinance() {
  return queryClient.invalidateQueries({
    predicate: (query) =>
      ['overview', 'projects', 'project', 'clients', 'client', 'invoices', 'payments', 'expenses', 'cheques'].includes(
        String(query.queryKey[0]),
      ),
  });
}
