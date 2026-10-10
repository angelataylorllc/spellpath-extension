import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  AUTH_REQUIRED,
  cacheUser,
  clearGoogleSession,
  fetchAuthMe,
  getAuthConfigError,
  getGoogleAccessToken,
  isAuthEnabled,
  loadCachedUser,
} from '../services/auth';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const authEnabled = isAuthEnabled();
  const configError = getAuthConfigError();
  const [user, setUser] = useState(null);
  const [entitlement, setEntitlement] = useState(null);
  const [loading, setLoading] = useState(authEnabled);
  const [error, setError] = useState(configError);

  const refreshSession = useCallback(async (interactive = false) => {
    if (!authEnabled) {
      setUser(null);
      setEntitlement(null);
      setError(null);
      setLoading(false);
      return null;
    }

    if (configError) {
      setUser(null);
      setEntitlement(null);
      setError(configError);
      setLoading(false);
      return null;
    }

    try {
      const token = await getGoogleAccessToken(interactive);
      const body = await fetchAuthMe(API_BASE, token);
      const nextUser = body.user || null;
      setUser(nextUser);
      setEntitlement(body.entitlement ?? null);
      setError(null);
      await cacheUser(nextUser);
      return nextUser;
    } catch (err) {
      setUser(null);
      setEntitlement(null);
      await cacheUser(null);
      if (!interactive) {
        setError(null);
        return null;
      }
      setError(err?.message || 'Sign-in failed');
      throw err;
    }
  }, [authEnabled, configError]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (!authEnabled) {
        setLoading(false);
        return;
      }

      if (configError) {
        setLoading(false);
        return;
      }

      const cached = await loadCachedUser();
      if (cached && !cancelled) setUser(cached);

      await refreshSession(false);
      if (!cancelled) setLoading(false);
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [authEnabled, configError, refreshSession]);

  const signIn = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await clearGoogleSession();
      return await refreshSession(true);
    } finally {
      setLoading(false);
    }
  }, [refreshSession]);

  const signOut = useCallback(async () => {
    await clearGoogleSession();
    setUser(null);
    setEntitlement(null);
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      authEnabled,
      authRequired: AUTH_REQUIRED,
      user,
      entitlement,
      setEntitlement,
      loading,
      error,
      signIn,
      signOut,
      refreshSession,
    }),
    [authEnabled, user, entitlement, loading, error, signIn, signOut, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
