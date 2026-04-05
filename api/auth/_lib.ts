/**
 * Auth backend library - signed cookie sessions using jose
 * No database required - session data is verified stateless JWT in a signed cookie
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SignJWT, jwtVerify, createRemoteJWKSet } from 'jose';

// ── Types ───────────────────────────────────────────────────────────────────

export interface GoogleUserPayload {
  sub: string;          // Google user ID
  email: string;
  name: string;
  picture?: string;
  email_verified: boolean;
}

export interface SessionPayload {
  sub: string;          // Google user ID
  email: string;
  name: string;
  picture?: string;
  iat: number;
  exp: number;
}

// ── Secrets ─────────────────────────────────────────────────────────────────

function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET environment variable is required');
  }
  return new TextEncoder().encode(secret);
}

// ── CORS ────────────────────────────────────────────────────────────────────

export function setCors(res: VercelResponse, origin?: string) {
  // When credentials are involved, origin must be the exact origin (not *)
  // If no origin is provided, Vercel provides it via headers
  res.setHeader('Access-Control-Allow-Origin', origin ?? '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export function handleOptions(req: VercelRequest, res: VercelResponse): boolean {
  // Use the request's actual origin for credential-based CORS
  setCors(res, req.headers.origin ?? '*');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

// ── Cookie helpers ──────────────────────────────────────────────────────────

const SESSION_COOKIE_NAME = 'clawph_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function setSessionCookie(res: VercelResponse, session: SessionPayload): Promise<void> {
  setCors(res);
  const secret = getSessionSecret();
  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);

  // HttpOnly: JS cannot read the cookie (XSS protection)
  // Secure: HTTPS only (Set=Lax for Vercel which may serve over HTTP in preview)
  // SameSite=Lax: sent on same-site navigations and top-level GET redirects
  // Max-Age=7d: session expires in 7 days
  res.setHeader('Set-Cookie',
    `${SESSION_COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE}`
  );
}

export async function clearSessionCookie(res: VercelResponse): Promise<void> {
  setCors(res);
  res.setHeader('Set-Cookie',
    `${SESSION_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
  );
}

export async function getSessionFromRequest(req: VercelRequest): Promise<SessionPayload | null> {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) return null;

  try {
    const secret = getSessionSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// Minimal cookie parser for Vercel serverless
function parseCookies(req: VercelRequest): Record<string, string> {
  const cookieHeader = req.headers.cookie ?? '';
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';').map((part) => {
      const idx = part.indexOf('=');
      if (idx < 0) return [part.trim(), ''];
      return [part.slice(0, idx).trim(), decodeURIComponent(part.slice(idx + 1).trim())];
    })
  );
}

// ── Google token verification ───────────────────────────────────────────────

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleUserPayload> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID environment variable is required');
  }

  // Google publishes its public keys at this JWKS endpoint
  const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: 'https://accounts.google.com',
    audience: clientId,
  });

  if (!payload.email_verified) {
    throw new Error('Google email is not verified');
  }

  return payload as unknown as GoogleUserPayload;
}
