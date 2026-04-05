/**
 * GoogleSignIn - Renders the Google Identity Services sign-in button.
 * The raw JWT credential is passed to onSuccess so the parent can send it
 * to the backend for cryptographic verification.
 *
 * Backend flow:
 *  1. Parent receives credential string
 *  2. POST /api/auth/google { credential }
 *  3. Backend verifies JWT signature against Google's JWKS + audience + issuer
 *  4. Backend sets signed HttpOnly session cookie
 */
import { useEffect, useState } from 'react';

const GIS_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
const SCRIPT_ID = 'gis-script';

function loadGis(): Promise<void> {
  if (document.getElementById(SCRIPT_ID)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.id = SCRIPT_ID;
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('GIS load failed'));
    document.head.appendChild(s);
  });
}

interface GoogleSignInProps {
  /** Called with the raw Google JWT credential for backend verification */
  onSuccess: (credential: string) => void;
  onError?: (message: string) => void;
  mode?: 'signin' | 'signup';
  containerRef: React.RefObject<HTMLDivElement | null>;
  fallbackText?: string;
}

export default function GoogleSignIn({
  onSuccess,
  onError,
  mode = 'signin',
  containerRef,
  fallbackText,
}: GoogleSignInProps) {
  const [gisReady, setGisReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!GIS_CLIENT_ID) {
      setLoadError('VITE_GOOGLE_CLIENT_ID is not configured');
      return;
    }
    loadGis()
      .then(() => {
        const win = window as Window & typeof globalThis & {
          google?: {
            accounts: {
              id: {
                initialize: (config: Record<string, unknown>) => void;
                renderButton: (el: HTMLElement, config: Record<string, unknown>) => void;
                prompt: () => void;
              };
            };
          };
        };
        win.google?.accounts.id.initialize({
          client_id: GIS_CLIENT_ID,
          callback: ({ credential }: { credential: string }) => {
            onSuccess(credential);
          },
        });
        setGisReady(true);
      })
      .catch(() => setLoadError('Failed to load Google sign-in'));
  }, [onSuccess]);

  useEffect(() => {
    if (!gisReady || !containerRef.current) return;
    const win = window as Window & typeof globalThis & {
      google?: {
        accounts: {
          id: {
            renderButton: (el: HTMLElement, config: Record<string, unknown>) => void;
            prompt: () => void;
          };
        };
      };
    };
    win.google?.accounts.id.renderButton(containerRef.current, {
      theme: 'outline',
      size: 'large',
      text: mode === 'signup' ? 'signup_with' : 'signin_with',
      width: Math.max(containerRef.current.clientWidth, 280),
    });
  }, [gisReady, containerRef, mode]);

  if (loadError) {
    if (fallbackText) {
      return (
        <button
          type="button"
          onClick={() => onError?.(loadError)}
          className="btn btn-secondary w-full justify-center text-sm"
        >
          {fallbackText}
        </button>
      );
    }
    return null;
  }

  return <div ref={containerRef} className="w-full" />;
}
