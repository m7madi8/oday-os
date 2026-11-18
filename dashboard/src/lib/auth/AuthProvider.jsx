import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import * as authApi from '../api/auth';
import { setUnauthorizedHandler } from '../api/client';
import { isLocalOfficeLoginEnabled, isLocalToken, tryLocalOfficeSession } from './office';
import { clearSession, loadSession, saveSession } from './session';
import { queryClient } from '../query';
import { loadStoredServerUrl } from '../env';

const AuthContext = createContext(null);

async function restoreSession() {
  const stored = await loadSession();
  if (stored?.token && isLocalToken(stored.token) && !isLocalOfficeLoginEnabled()) {
    await clearSession();
    return null;
  }
  return stored;
}

export function AppProviders({ children }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);

  const logout = useCallback(async () => {
    try {
      if (session?.token && !isLocalToken(session.token)) await authApi.logout();
    } catch {
      /* local logout still proceeds */
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
      .then(() => restoreSession())
      .then(setSession)
      .finally(() => setReady(true));
    return () => setUnauthorizedHandler(null);
  }, []);

  const authenticate = useCallback(async (email, password, otp) => {
    const local = tryLocalOfficeSession(email, password);
    if (local) {
      return local;
    }

    return authApi.login({
      email,
      password,
      one_time_password: otp,
    });
  }, []);

  const applySession = useCallback(async (payload) => {
    queryClient.clear();
    await saveSession(payload);
    setSession({ token: payload.token, user: payload.user, company: payload.company });
  }, []);

  const login = useCallback(async (email, password, otp) => {
    const payload = await authenticate(email, password, otp);
    await applySession(payload);
  }, [authenticate, applySession]);

  const value = useMemo(
    () => ({ ready, session, login, authenticate, applySession, logout }),
    [ready, session, login, authenticate, applySession, logout],
  );

  return (
    <AuthContext.Provider value={value}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AppProviders');
  return ctx;
}
