/**
 * Unified payment webhook entry point.
 *
 * This handler acts as a router, delegating to the appropriate provider
 * normalizer based on the request path:
 *
 *   POST /api/payments/webhook          — generic (logs + returns 200, no-op in dev)
 *   POST /api/payments/webhook/xendit  — Xendit normalizer
 *   POST /api/payments/webhook/paymongo — PayMongo normalizer
 *
 * In production you would point your Xendit/PayMongo webhook URL directly at
 * the provider-specific path (e.g. /api/payments/webhook/xendit) so the router
 * here is only needed during multi-provider transition.
 *
 * Env vars:
 *   PAYMENT_PROVIDER=manual|xendit|paymongo  — selects which provider normalizer is active
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleOptions, setCors } from './_lib';
import xenditHandler from './webhooks/xendit';
import paymongoHandler from './webhooks/paymongo';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  setCors(res);

  // Route to provider-specific handler based on PAYMENT_PROVIDER env
  const provider = process.env.PAYMENT_PROVIDER ?? 'manual';

  if (provider === 'xendit') {
    return xenditHandler(req, res);
  }

  if (provider === 'paymongo') {
    return paymongoHandler(req, res);
  }

  // Manual / dev mode — log and acknowledge
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const signature =
    req.headers['x-provider-signature'] ??
    req.headers['paymongo-signature'] ??
    req.headers['x-callback-token'] ??
    null;

  console.log('[webhook] Manual/dev mode — received event', {
    provider,
    hasSignature: Boolean(signature),
    body: req.body,
  });

  return res.status(200).json({
    success: true,
    received: true,
    provider,
    mode: 'manual',
    message:
      'No live payment provider configured. Set PAYMENT_PROVIDER=xendit or paymongo and provide provider keys to enable webhook processing.',
  });
}
