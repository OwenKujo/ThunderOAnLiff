import liff from '@line/liff';
import { liffApi } from '../lib/api';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface LiffProfile { userId: string; displayName: string; pictureUrl?: string }
interface LiffSession { loading: boolean; token: string | null; profile: LiffProfile | null; error: string | null }
interface ApplicationSessionResponse { accessToken: string; tokenType: 'Bearer'; expiresIn: number }
const LiffContext = createContext<LiffSession | null>(null);

export function LiffSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<LiffSession>({ loading: true, token: null, profile: null, error: null });
  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      const liffId = import.meta.env.VITE_LIFF_ID as string | undefined;
      if (!liffId) {
        setSession({ loading: false, token: null, profile: null, error: 'LIFF is not configured. Set VITE_LIFF_ID in the frontend environment and restart the dev server.' });
        return;
      }
      try {
        await liff.init({ liffId });
        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href });
          return;
        }
        const token = liff.getIDToken();
        if (!token) throw new Error('No LINE ID token was returned. Make sure the LIFF channel has the openid scope enabled.');
        const profile = await liff.getProfile().catch(() => null);
        // Exchange the LINE ID token once. The API verifies it with LINE and returns a short-lived app session.
        // Subsequent API requests are verified locally instead of calling LINE's verification endpoint every time.
        const applicationSession = await liffApi.publicPost<ApplicationSessionResponse>('/auth/line/session', { idToken: token });
        if (!cancelled) setSession({
          loading: false, token: applicationSession.accessToken,
          profile: profile ? { userId: profile.userId, displayName: profile.displayName, pictureUrl: profile.pictureUrl } : null,
          error: null,
        });
      } catch (error) {
        if (!cancelled) setSession({ loading: false, token: null, profile: null, error: error instanceof Error ? error.message : 'Unable to initialize LINE LIFF.' });
      }
    }
    void initialize();
    return () => { cancelled = true; };
  }, []);
  const value = useMemo(() => session, [session]);
  return <LiffContext.Provider value={value}>{children}</LiffContext.Provider>;
}

export function useLiffSession() {
  const value = useContext(LiffContext);
  if (!value) throw new Error('useLiffSession must be used within LiffSessionProvider');
  return value;
}
