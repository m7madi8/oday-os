import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import * as authApi from '../api/auth';
import { setUnauthorizedHandler } from '../api/client';
import { clearSession, isLocalToken, loadSession, saveSession } from './session';
import { queryClient } from '../query';
import { loadStoredServerUrl } from '../env';

const OFFICE_USERNAME = 'oday';
const OFFICE_PASSWORD = 'oday';

const AuthContext = createContext(null);

function isOfficeLogin(username, password) {
  return username.trim().toLowerCase() === OFFICE_USERNAME && password === OFFICE_PASSWORD;
}

function localOfficeSession() {
  return {
    token: 'local:oday',
    user: {
      id: 'oday',
      email: 'oday',
      first_name: 'عدي',
      last_name: 'أبو ضحى',
      is_admin: true,
      is_owner: true,
      permissions: '',
    },
    company: {
      id: 'oday',
      name: 'مكتب عدي أبو ضحى',
      currency_id: '1',
    },
  };
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
      .then(() => loadSession())
      .then(setSession)
      .finally(() => setReady(true));
    return () => setUnauthorizedHandler(null);
  }, []);

  const authenticate = useCallback(async (email, password, otp) => {
    if (isOfficeLogin(email, password) && !otp) {
      return localOfficeSession();
    }

    return authApi.login({
      email,
      password,
      one_time_password: otp,
    });
  }, []);

  const applySession = useCallback(async (payload) => {
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
