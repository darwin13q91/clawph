/**
 * POST /api/auth/google
 * Verify Google ID token and create a signed session cookie.
 * Body: { credential: string }  — the Google Identity Services JWT
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setSessionCookie, verifyGoogleIdToken, handleOptions } from './_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { credential } = req.body ?? {};

    if (!credential || typeof credential !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing or invalid credential' });
    }

    // Verify the Google JWT and extract user info
    const googleUser = await verifyGoogleIdToken(credential);

    // Build session payload (iat/exp added by setSessionCookie via SignJWT)
    const session = {
      sub: googleUser.sub,
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
    };

    // Set signed cookie
    await setSessionCookie(res, session);

    return res.status(200).json({
      success: true,
      user: {
        sub: googleUser.sub,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
      },
    });
  } catch (error) {
    console.error('Google auth error:', error);
    return res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
    });
  }
}
