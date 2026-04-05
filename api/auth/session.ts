/**
 * GET /api/auth/session
 * Return the currently authenticated user, if any.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSessionFromRequest, handleOptions } from './_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const session = await getSessionFromRequest(req);

  if (!session) {
    return res.status(200).json({ success: true, authenticated: false, user: null });
  }

  return res.status(200).json({
    success: true,
    authenticated: true,
    user: {
      sub: session.sub,
      email: session.email,
      name: session.name,
      picture: session.picture,
    },
  });
}
