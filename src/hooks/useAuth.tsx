/**
 * useAuth — authentication state + actions for the DiagramMind mobile app.
 *
 * Persists the JWT Bearer token in AsyncStorage so the Axios interceptor
 * can attach it to every request (see apiClient.ts).
 * Also caches the user row in the local SQLite `user_session` table for
 * instant reads without a network round-trip on cold start.
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  apiLogin,
  apiRegister,
  apiLogout,
  apiGetMe,
  TokenStore,
  type LoginRequest,
  type RegisterRequest,
} from '../api/apiClient';
import { getDb } from '../db/database';
import type { AuthUser } from '../types/models';

// ─── Auth context shape ────────────────────────────────────────────────────

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (body: LoginRequest) => Promise<boolean>;
  register: (body: RegisterRequest) => Promise<boolean>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

// ─── SQLite helpers ────────────────────────────────────────────────────────

async function saveUserToDb(user: AuthUser, token: string): Promise<void> {
  const db = await getDb();
  await db.executeSql('DELETE FROM user_session;');
  await db.executeSql(
    'INSERT INTO user_session (id, email, name, token) VALUES (?, ?, ?, ?);',
    [user.id, user.email, user.name ?? null, token]
  );
}

async function loadUserFromDb(): Promise<{ user: AuthUser; token: string } | null> {
  try {
    const db = await getDb();
    const [result] = await db.executeSql('SELECT * FROM user_session LIMIT 1;');
    if (result.rows.length === 0) return null;
    const row = result.rows.item(0);
    return {
      user:  { id: row.id, email: row.email, name: row.name },
      token: row.token,
    };
  } catch {
    return null;
  }
}

async function clearUserFromDb(): Promise<void> {
  const db = await getDb();
  await db.executeSql('DELETE FROM user_session;');
}

// ─── Provider ──────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user,    setUser]    = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const isMounted             = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    (async () => {
      // 1. Try SQLite cache first (instant — no network)
      const cached = await loadUserFromDb();
      if (cached) {
        await TokenStore.save(cached.token);
        if (isMounted.current) setUser(cached.user);
      }

      // 2. Verify token with server (may be expired)
      const token = await TokenStore.get();
      if (token) {
        if (token === 'guest_token') {
          if (isMounted.current) {
            setUser({ id: 'guest', email: 'guest@local', name: 'Guest User' });
          }
        } else {
          const me = await apiGetMe();
          if (isMounted.current) {
            if (me) {
              setUser(me);
            } else {
              // Token expired — clear everything
              await TokenStore.clear();
              await clearUserFromDb();
              setUser(null);
            }
          }
        }
      }

      if (isMounted.current) setLoading(false);
    })();
    return () => { isMounted.current = false; };
  }, []);

  const login = useCallback(async (body: LoginRequest): Promise<boolean> => {
    if (isMounted.current) { setLoading(true); setError(null); }
    try {
      const data = await apiLogin(body);
      await TokenStore.save(data.token);
      await saveUserToDb(data.user, data.token);
      if (isMounted.current) setUser(data.user);
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? 'Sign in failed';
      if (isMounted.current) setError(msg);
      return false;
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  const register = useCallback(async (body: RegisterRequest): Promise<boolean> => {
    if (isMounted.current) { setLoading(true); setError(null); }
    try {
      const data = await apiRegister(body);
      await TokenStore.save(data.token);
      await saveUserToDb(data.user, data.token);
      if (isMounted.current) setUser(data.user);
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? 'Registration failed';
      if (isMounted.current) setError(msg);
      return false;
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  const loginAsGuest = useCallback(async () => {
    if (isMounted.current) { setLoading(true); setError(null); }
    try {
      const guestUser: AuthUser = { id: 'guest', email: 'guest@local', name: 'Guest User' };
      await TokenStore.save('guest_token');
      await saveUserToDb(guestUser, 'guest_token');
      if (isMounted.current) setUser(guestUser);
    } catch (err: any) {
      if (isMounted.current) setError(err?.message ?? 'Guest login failed');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    if (isMounted.current) setLoading(true);
    try { await apiLogout(); } catch { /* best-effort */ }
    await TokenStore.clear();
    await clearUserFromDb();
    if (isMounted.current) { setUser(null); setLoading(false); }
  }, []);

  const clearError = useCallback(() => {
    if (isMounted.current) setError(null);
  }, []);

  const value: AuthState = {
    user,
    isAuthenticated: !!user,
    loading,
    error,
    login,
    register,
    loginAsGuest,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export default useAuth;
