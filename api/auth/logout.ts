/**
 * DELETE /api/auth/logout
 * Clear the session cookie and log the user out.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { clearSessionCookie, handleOptions } from './_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  if (req.method !== 'DELETE' && req.method !== 'POST') {
    res.setHeader('Allow', 'DELETE, POST, OPTIONS');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  await clearSessionCookie(res);

  return res.status(200).json({ success: true });
}
