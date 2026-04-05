/**
 * useAuth - Google OAuth session hook for ClawPH
 * Manages auth state, Google Identity Services initialization, and session polling.
 *
 * Usage:
 *   <AuthProvider> wraps the app in App.tsx
 *   useAuth() returns { user, authenticated, loading, signIn, signOut, checkSession }
 *
 * Note: The actual Google sign-in button is in GoogleSignIn.tsx component.
 * This hook manages the session state after Google credential verification.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

// ── Types ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  authenticated: boolean;
  loading: boolean;
  signIn: (credential: string) => Promise<void>;
  signOut: () => Promise<void>;
  checkSession: () => Promise<void>;
}

// ── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Script loader ───────────────────────────────────────────────────────────

const GIS_SCRIPT_ID = 'google-identity-services';
const GIS_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

function loadGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(GIS_SCRIPT_ID)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = GIS_SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

// ── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session', { credentials: 'include' });
      const data = await res.json();
      if (data.authenticated && data.user) {
        setUser(data.user as AuthUser);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const signIn = useCallback(async (credential: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? 'Sign-in failed');
      }
      setUser(data.user as AuthUser);
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'DELETE', credentials: 'include' });
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize GIS + check existing session on mount
  useEffect(() => {
    if (!GIS_CLIENT_ID) {
      console.warn('[useAuth] VITE_GOOGLE_CLIENT_ID not set — Google sign-in disabled');
      setLoading(false);
      return;
    }

    loadGisScript()
      .then(() => {
        const win = window as Window & typeof globalThis & {
          google?: {
            accounts: {
              id: {
                initialize: (config: Record<string, unknown>) => void;
              };
            };
          };
        };
        win.google?.accounts.id.initialize({
          client_id: GIS_CLIENT_ID,
          callback: async ({ credential }: { credential: string }) => {
            await signIn(credential);
          },
        });
      })
      .catch((err) => console.error('[useAuth] GIS init error:', err))
      .finally(() => {
        void checkSession();
      });
  }, [checkSession, signIn]);

  return (
    <AuthContext.Provider value={{ user, authenticated: !!user, loading, signIn, signOut, checkSession }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
