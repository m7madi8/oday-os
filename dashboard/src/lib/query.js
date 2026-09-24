import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 8_000,
      gcTime: 30 * 60_000,
      retry: (failureCount, error) => {
        if (error?.status === 401 || error?.status === 403) return false;
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8_000),
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
      refetchInterval: (query) => (query.state.status === 'error' ? false : 12_000),
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
  cheques: (key = '') => ['cheques', key],
  cheque: (id) => ['cheque', id],
  chequeSummary: (direction = 'all') => ['cheque-summary', direction],
  documents: (filter = '') => ['documents', filter],
  employees: (key = '') => ['employees', key],
  payrollPayments: (key = '') => ['payroll-payments', key],
  deadDebts: () => ['dead-debts'],
};

export function invalidateFinance() {
  return queryClient.invalidateQueries({
    predicate: (query) =>
      ['overview', 'projects', 'project', 'clients', 'client', 'invoices', 'payments', 'expenses', 'cheques', 'cheque', 'cheque-summary', 'documents', 'employees', 'payroll-payments'].includes(
        String(query.queryKey[0]),
      ),
  });
}
