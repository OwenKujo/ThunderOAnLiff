import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AdminSession } from '@thunder/shared';
import { api } from '../../lib/api';

interface AuthContextValue {
  token: string | null;
  admin: AdminSession['admin'] | null;
  signIn(email: string, password: string): Promise<void>;
  signOut(): void;
}
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('thunder.admin.token'));
  const [admin, setAdmin] = useState<AdminSession['admin'] | null>(() => {
    try { const value = sessionStorage.getItem('thunder.admin.profile'); return value ? JSON.parse(value) as AdminSession['admin'] : null; } catch { return null; }
  });

  useEffect(() => {
    const expireSession = () => { setToken(null); setAdmin(null); };
    window.addEventListener('thunder:session-expired', expireSession);
    return () => window.removeEventListener('thunder:session-expired', expireSession);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    token, admin,
    async signIn(email, password) {
      const session = await api.post<AdminSession>('/auth/admin/login', { email, password }, null);
      sessionStorage.setItem('thunder.admin.token', session.accessToken);
      sessionStorage.setItem('thunder.admin.profile', JSON.stringify(session.admin));
      setToken(session.accessToken);
      setAdmin(session.admin);
    },
    signOut() {
      sessionStorage.removeItem('thunder.admin.token');
      sessionStorage.removeItem('thunder.admin.profile');
      setToken(null);
      setAdmin(null);
    },
  }), [token, admin]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
