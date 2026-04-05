import type { VercelRequest, VercelResponse } from '@vercel/node';
import { badRequest, getQuote, handleOptions, setCors } from './_lib';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  setCors(res);

  if (req.method !== 'GET') {
    return badRequest(res, 'Method not allowed', 405);
  }

  const planId = req.query.planId;
  const currency = req.query.currency === 'USD' ? 'USD' : 'PHP';

  if (typeof planId !== 'string' || (planId !== 'openclaw-growth' && planId !== 'openclaw-setup')) {
    return badRequest(res, 'Invalid or missing planId');
  }

  const quote = getQuote(planId, currency);
  return res.status(200).json({ success: true, quote });
}
