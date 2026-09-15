import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 8_000,
      gcTime: 30 * 60_000,
      retry: 1,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
      refetchInterval: 12_000,
      refetchIntervalInBackground: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const keys = {
  overview: ['overview'],
  office: ['office-settings'],
  session: ['session'],
  projects: (filter = '') => ['projects', filter],
  project: (id) => ['project', id],
  clients: (filter = '') => ['clients', filter],
  client: (id) => ['client', id],
  invoices: (filter = '') => ['invoices', filter],
  payments: (filter = '') => ['payments', filter],
  expenses: (filter = '') => ['expenses', filter],
  cheques: (filter = '') => ['cheques', filter],
  documents: (filter = '') => ['documents', filter],
};

export function invalidateFinance() {
  return queryClient.invalidateQueries({
    predicate: (query) =>
      ['overview', 'projects', 'project', 'clients', 'client', 'invoices', 'payments', 'expenses', 'cheques', 'documents'].includes(
        String(query.queryKey[0]),
      ),
  });
}
