/**
 * Xendit webhook handler + payload normalizer.
 *
 * Xendit sends events to POST /api/payments/webhooks/xendit
 * with an XENDIT_CALLBACK_TOKEN header.
 *
 * Env vars required:
 *   XENDIT_CALLBACK_TOKEN   — your Xendit callback token (for signature verification)
 *
 * This handler:
 *  1. Verifies the Xendit signature (if XENDIT_CALLBACK_TOKEN is set)
 *  2. Normalizes the Xendit event into our internal payment_event schema
 *  3. Forwards the normalized event to /api/payments/events for recording
 *
 * DO NOT auto-fulfill without verifying the signature.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleOptions, setCors } from '../_lib';
import { getSupabase } from '../../../src/lib/supabase';

// ── Xendit event type mapping ────────────────────────────────────────────────
// Xendit status → our internal PaymentEventType

const XENDIT_STATUS_MAP: Record<string, { eventType: string; isTerminal: boolean }> = {
  'PAID':                 { eventType: 'payment.confirmed',  isTerminal: false },
  'SUCCESS':              { eventType: 'payment.confirmed',  isTerminal: false },
  'FAILED':              { eventType: 'payment.failed',     isTerminal: true  },
  'EXPIRED':             { eventType: 'payment.cancelled', isTerminal: true  },
  'CANCELLED':           { eventType: 'payment.cancelled', isTerminal: true  },
  'REFUNDED':            { eventType: 'payment.refunded',  isTerminal: true  },
  'PENDING':             { eventType: 'payment.pending',   isTerminal: false },
  'VA_PENDING':          { eventType: 'payment.pending',   isTerminal: false },
  'OVERDUE':             { eventType: 'payment.failed',   isTerminal: true  },
  'SETTLED':             { eventType: 'payment.confirmed', isTerminal: false },
};

function findSubscriptionIntentByProviderRef(
  supabase: ReturnType<typeof import('../../../src/lib/supabase').getSupabase>,
  provider: string,
  providerRef: string
) {
  // Look up by checkout_request_id (which we store as metadata in Xendit)
  return supabase
    .from('subscription_intents')
    .select('id, checkout_request_id, status, amount_local, currency')
    .eq('checkout_request_id', providerRef)
    .maybeSingle();
}

async function verifyXenditSignature(
  rawBody: string,
  signature: string | null,
  callbackToken: string
): Promise<boolean> {
  if (!signature) return false;
  // Xendit uses HMAC-SHA256
  const encoder = new TextEncoder();
  const key = encoder.encode(callbackToken);
  const data = encoder.encode(rawBody);
  const { subtle } = await import('crypto').then((m) => m.webcrypto ?? m);
  const hash = await subtle.digest('SHA256', data);
  const expected = Buffer.from(hash).toString('hex');
  // Constant-time compare to avoid timing attacks
  if (signature.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < signature.length; i++) {
    diff |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

interface XenditInvoiceEvent {
  id: string;
  status: string;
  external_id: string;
  amount: number;
  currency: string;
  paid_at: string | null;
  payment_method: string | null;
  metadata: Record<string, unknown>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  setCors(res);

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const callbackToken = process.env.XENDIT_CALLBACK_TOKEN;
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

  // ── Signature verification ────────────────────────────────────────────
  if (callbackToken) {
    const signature =
      req.headers['x-end-callback-token'] ??
      req.headers['x-callback-token'] ??
      null;

    const isValid = await verifyXenditSignature(rawBody, signature as string | null, callbackToken);
    if (!isValid) {
      console.warn('[xendit] Invalid signature — rejecting webhook');
      return res.status(401).json({ success: false, error: 'Invalid signature' });
    }
    console.log('[xendit] Signature verified');
  } else {
    console.warn('[xendit] XENDIT_CALLBACK_TOKEN not set — skipping signature verification (dev only)');
  }

  // ── Parse and normalize ─────────────────────────────────────────────────
  const xenditEvent = req.body as {
    event?: string;
    id?: string;
    status?: string;
    external_id?: string;
    amount?: number;
    currency?: string;
    paid_at?: string;
    payment_method?: string;
    metadata?: Record<string, unknown>;
  };

  if (!xenditEvent?.id || !xenditEvent?.status) {
    return res.status(400).json({ success: false, error: 'Missing required Xendit fields' });
  }

  const supabase = getSupabase();

  // Find our subscription intent via external_id (maps to checkout_request_id)
  const { data: intent, error: intentError } = await findSubscriptionIntentByProviderRef(
    supabase,
    'xendit',
    xenditEvent.external_id ?? ''
  );

  if (intentError) {
    console.error('[xendit] DB lookup error:', intentError);
    return res.status(500).json({ success: false, error: 'Internal error' });
  }

  if (!intent) {
    console.warn(`[xendit] No subscription_intent found for external_id: ${xenditEvent.external_id}`);
    return res.status(404).json({ success: false, error: 'Subscription intent not found' });
  }

  const statusInfo = XENDIT_STATUS_MAP[xenditEvent.status] ?? {
    eventType: `xendit.${xenditEvent.status.toLowerCase()}`,
    isTerminal: false,
  };

  // ── Record normalized event ─────────────────────────────────────────────
  const { data: paymentEvent, error: recordError } = await supabase
    .from('payment_events')
    .insert({
      subscription_intent_id: intent.id,
      event_type: statusInfo.eventType,
      provider: 'xendit',
      provider_event_id: xenditEvent.id,
      amount: xenditEvent.amount ?? null,
      currency: xenditEvent.currency ?? null,
      raw_payload: xenditEvent as unknown as Record<string, unknown>,
    })
    .select('id')
    .single();

  if (recordError) {
    console.error('[xendit] Failed to record payment event:', recordError);
    return res.status(500).json({ success: false, error: 'Failed to record event' });
  }

  console.log(`[xendit] Recorded event ${paymentEvent.id} for intent ${intent.id} — status: ${xenditEvent.status}`);

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
