import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AuthApi, getToken, setToken, setUnauthorizedHandler } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await AuthApi.me();
      setUser(data.user);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
    setUnauthorizedHandler(() => {
      setToken(null);
      setUser(null);
    });
  }, [loadMe]);

  const login = useCallback((token, user) => {
    setToken(token);
    setUser(user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await AuthApi.logout();
    } catch {
      // token is discarded client-side regardless
    }
    setToken(null);
    setUser(null);
  }, []);

  const value = { user, loading, login, logout, refresh: loadMe };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
