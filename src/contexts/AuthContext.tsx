import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

interface AuthState {
  token: string;
  expiresAt: number;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => void;
}

const AUTH_KEY = 'gsr_dashboard_session';

const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredAuth(): AuthState | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const parsed: AuthState = JSON.parse(raw);
    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem(AUTH_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(AUTH_KEY);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredAuth();
    setIsAuthenticated(!!stored);
    setIsLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<string | null> => {
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/dashboard-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return data.error || 'Login failed';
      }

      const authState: AuthState = { token: data.token, expiresAt: data.expiresAt };
      localStorage.setItem(AUTH_KEY, JSON.stringify(authState));
      setIsAuthenticated(true);
      return null;
    } catch {
      return 'Unable to connect. Please try again.';
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
