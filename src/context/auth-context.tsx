import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type AuthSession, verifyToken, revokeSession } from '@/services/auth-api';

const STORAGE_KEY = 'hc_seller_session';

async function readStoredSession(): Promise<AuthSession | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

async function writeSession(s: AuthSession | null): Promise<void> {
  try {
    if (s) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  } catch { /* storage unavailable — session will not persist across restarts */ }
}

interface AuthContextValue {
  initializing:    boolean;
  isAuthenticated: boolean;
  session:         AuthSession | null;
  login:  (s: AuthSession) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [initializing,    setInitializing]    = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [session,         setSession]         = useState<AuthSession | null>(null);

  // On mount — restore stored session; verify token in background so offline
  // or slow AuthSvc doesn't force re-login on every cold start.
  useEffect(() => {
    async function bootstrap() {
      try {
        const stored = await readStoredSession();
        if (!stored) return;

        // Optimistically restore the session immediately so the app opens fast.
        setSession(stored);
        setIsAuthenticated(true);

        // Then validate in background; revoke locally only on explicit "invalid" reply.
        try {
          const result = await verifyToken(stored.token);
          if (!result.valid) {
            await writeSession(null);
            setSession(null);
            setIsAuthenticated(false);
          }
        } catch {
          // AuthSvc unreachable — keep the restored session so the seller can
          // still use the app offline (orders and catalog are cached).
        }
      } catch {
        // Corrupted AsyncStorage entry — start fresh.
      } finally {
        setInitializing(false);
      }
    }
    bootstrap();
  }, []);

  const login = useCallback(async (s: AuthSession) => {
    await writeSession(s);
    setSession(s);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    if (session) {
      try {
        await revokeSession(session.sessionId, session.token);
      } catch { /* silent — clear locally regardless */ }
    }
    await writeSession(null);
    setSession(null);
    setIsAuthenticated(false);
  }, [session]);

  return (
    <AuthContext.Provider value={{ initializing, isAuthenticated, session, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
