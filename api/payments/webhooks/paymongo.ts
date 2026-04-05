/**
 * PayMongo webhook handler + payload normalizer.
 *
 * PayMongo sends events to POST /api/payments/webhooks/paymongo
 * with a PayMongo-Signature header (HMAC-SHA256).
 *
 * Env vars required:
 *   PAYMONGO_SIGNING_KEY   — your PayMongo webhook signing key
 *
 * This handler:
 *  1. Verifies the PayMongo HMAC signature
 *  2. Normalizes the PayMongo event into our internal payment_event schema
 *  3. Records the event via Supabase
 *
 * PayMongo status lifecycle:
 *   pending → awaiting_payment_methods → paid → succeed
 *   pending → failed
 *   paid → refunded
 *
 * DO NOT auto-fulfill without live keys and signature verification.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleOptions, setCors } from '../_lib';
import { getSupabase } from '../../../src/lib/supabase';

// ── PayMongo attributes.status mapping ──────────────────────────────────────

const PAYMONGO_STATUS_MAP: Record<string, { eventType: string; isTerminal: boolean }> = {
  'pending':                  { eventType: 'payment.pending',          isTerminal: false },
  'awaiting_payment_methods': { eventType: 'payment.pending',          isTerminal: false },
  'paid':                     { eventType: 'payment.confirmed',        isTerminal: false },
  'succeed':                  { eventType: 'payment.confirmed',        isTerminal: false }, // legacy
  'failed':                   { eventType: 'payment.failed',           isTerminal: true  },
  'expired':                  { eventType: 'payment.cancelled',        isTerminal: true  },
  'refunded':                 { eventType: 'payment.refunded',         isTerminal: true  },
  'cancelled':                { eventType: 'payment.cancelled',        isTerminal: true  },
};

async function verifyPaymongoSignature(
  rawBody: string,
  signature: string | null,
  signingKey: string
): Promise<boolean> {
  if (!signature) return false;
  const encoder = new TextEncoder();
  const key = encoder.encode(signingKey);
  const data = encoder.encode(rawBody);
  const { subtle } = await import('crypto').then((m) => m.webcrypto ?? m);
  const hash = await subtle.digest('SHA256', data);
  const expected = `sha256=${Buffer.from(hash).toString('hex')}`;
  // Constant-time compare
  if (signature.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < signature.length; i++) {
    diff |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

interface PaymongoPaymentIntentAttributes {
  id: string;
  type: string;
  livemode: boolean;
  status: string;
  amount: number;
  currency: string;
  payment_method_options?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  created_at: number;
  updated_at: number;
  last_payment_error?: unknown;
}

interface PaymongoEvent {
  id: string;
  type: string;
  attributes: PaymongoPaymentIntentAttributes;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  setCors(res);

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const signingKey = process.env.PAYMONGO_SIGNING_KEY;
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

  // ── Signature verification ────────────────────────────────────────────
  if (signingKey) {
    const signature =
      req.headers['paymongo-signature'] ??
      req.headers['x-paymongo-signature'] ??
      null;

    const isValid = await verifyPaymongoSignature(rawBody, signature as string | null, signingKey);
    if (!isValid) {
      console.warn('[paymongo] Invalid signature — rejecting webhook');
      return res.status(401).json({ success: false, error: 'Invalid signature' });
    }
    console.log('[paymongo] Signature verified');
  } else {
    console.warn('[paymongo] PAYMONGO_SIGNING_KEY not set — skipping signature verification (dev only)');
  }

  // ── Parse and normalize ─────────────────────────────────────────────────
  const event = req.body as PaymongoEvent;

  if (!event?.id || !event?.attributes) {
    return res.status(400).json({ success: false, error: 'Missing required PayMongo fields' });
  }

  const { attributes } = event;
  const statusInfo = PAYMONGO_STATUS_MAP[attributes.status] ?? {
    eventType: `paymongo.${attributes.status}`,
    isTerminal: false,
  };

  // Extract our checkout_request_id from PayMongo metadata
  const checkoutRequestId =
    typeof attributes.metadata?.checkout_request_id === 'string'
      ? attributes.metadata.checkout_request_id
      : Array.isArray(attributes.metadata?.checkout_request_id)
      ? (attributes.metadata.checkout_request_id as string[])[0]
      : null;

  const supabase = getSupabase();

  // Look up our subscription intent
  let intentId: string | null = null;

  if (checkoutRequestId) {
    const { data: intent } = await supabase
      .from('subscription_intents')
      .select('id')
      .eq('checkout_request_id', checkoutRequestId)
      .maybeSingle();
    intentId = intent?.id ?? null;
  }

  if (!intentId) {
    console.warn(`[paymongo] No subscription_intent found for checkout_request_id: ${checkoutRequestId}`);
    return res.status(404).json({ success: false, error: 'Subscription intent not found' });
  }

  // ── Record normalized event ─────────────────────────────────────────────
  const { data: paymentEvent, error: recordError } = await supabase
    .from('payment_events')
    .insert({
      subscription_intent_id: intentId,
      event_type: statusInfo.eventType,
      provider: 'paymongo',
      provider_event_id: attributes.id,
      amount: attributes.amount / 100, // PayMongo amounts are in centavos
      currency: attributes.currency?.toUpperCase() ?? null,
      raw_payload: event as unknown as Record<string, unknown>,
    })
    .select('id')
    .single();

  if (recordError) {
    console.error('[paymongo] Failed to record payment event:', recordError);
    return res.status(500).json({ success: false, error: 'Failed to record event' });
  }

  console.log(
    `[paymongo] Recorded event ${paymentEvent.id} for intent ${intentId} — status: ${attributes.status}`
  );

  return res.status(200).json({
    success: true,
    received: true,
    normalized: true,
    eventId: paymentEvent.id,
    message: statusInfo.isTerminal
      ? 'Terminal event received — awaiting manual or payment-provider confirmation for fulfillment'
      : 'Event recorded — auto-fulfillment requires live provider keys',
  });
}
