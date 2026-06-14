import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { type AuthSession, verifyToken, revokeSession } from '@/services/auth-api';

// Production: replace this module-level store with expo-secure-store
// import * as SecureStore from 'expo-secure-store';
// const STORAGE_KEY = 'hc_seller_session';
let _inMemorySession: AuthSession | null = null;

async function readStoredSession(): Promise<AuthSession | null> {
  return _inMemorySession;
}
async function writeSession(s: AuthSession | null): Promise<void> {
  _inMemorySession = s;
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

  // On mount — check if we have a stored session and it's still valid
  useEffect(() => {
    async function bootstrap() {
      try {
        const stored = await readStoredSession();
        if (stored) {
          const result = await verifyToken(stored.token);
          if (result.valid) {
            setSession(stored);
            setIsAuthenticated(true);
          } else {
            await writeSession(null);
          }
        }
      } catch {
        // Network down or AuthSvc not running — treat as unauthenticated
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
