import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import * as authApi from '@/lib/api/auth';
import { setUnauthorizedHandler } from '@/lib/api/client';
import { isLocalToken, isOfficeLogin, localOfficeSession } from '@/lib/auth/office';
import { clearSession, loadSession, saveSession, type StoredSession } from '@/lib/auth/session';
import { invalidateFinance, queryClient } from '@/lib/query';
import { loadStoredServerUrl } from '@/lib/server';

type AuthContextValue = {
  ready: boolean;
  session: StoredSession | null;
  login: (email: string, password: string, otp?: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AppProviders({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<StoredSession | null>(null);

  const logout = useCallback(async () => {
    try {
      if (session?.token && !isLocalToken(session.token)) {
        await authApi.logout();
      }
    } catch {
      // Local logout still proceeds.
    }
    await clearSession();
    queryClient.clear();
    setSession(null);
  }, [session?.token]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession().then(() => {
        queryClient.clear();
        setSession(null);
      });
    });
    loadStoredServerUrl()
      .then(() => loadSession())
      .then(setSession)
      .finally(() => setReady(true));
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && session) {
        void invalidateFinance();
      }
    });
    return () => sub.remove();
  }, [session]);

  const login = useCallback(async (email: string, password: string, otp?: string) => {
    const payload = isOfficeLogin(email, password)
      ? localOfficeSession()
      : await authApi.login({
          email,
          password,
          one_time_password: otp,
        });
    await saveSession(payload);
    setSession({ token: payload.token, user: payload.user, company: payload.company });
  }, []);

  const value = useMemo(
    () => ({ ready, session, login, logout }),
    [ready, session, login, logout],
  );

  return (
    <AuthContext.Provider value={value}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AppProviders');
  }
  return ctx;
}
