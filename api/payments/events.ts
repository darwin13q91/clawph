/**
 * Payment events recording endpoint.
 *
 * Used internally by webhook normalizers (Xendit/PayMongo) and by the admin ops
 * page to record manual status changes.
 *
 * POST /api/payments/events
 * Body: { subscriptionIntentId?, provisioningJobId?, eventType, provider, ... }
 *
 * No auth required — callers are trusted internal services.
 * Use the OPS_SECRET header to validate internal service calls in production.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleOptions, setCors } from './_lib';
import { getSupabase } from '../../src/lib/supabase';

export type PaymentEventType =
  | 'payment.pending'
  | 'payment.confirmed'
  | 'payment.failed'
  | 'payment.cancelled'
  | 'payment.refunded'
  | 'provisioning.not_started'
  | 'provisioning.started'
  | 'provisioning.completed'
  | 'provisioning.failed'
  | 'provisioning.cancelled'
  | 'manual.confirmed'
  | 'manual.fulfilled'
  | 'manual.failed'
  | 'manual.trigger';

export interface PaymentEventInput {
  subscriptionIntentId?: string;
  provisioningJobId?: string;
  eventType: PaymentEventType;
  provider?: string;
  providerEventId?: string;
  amount?: number;
  currency?: string;
  rawPayload?: Record<string, unknown>;
}

async function recordPaymentEvent(
  input: PaymentEventInput
): Promise<{ success: boolean; eventId: string }> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('payment_events')
    .insert({
      subscription_intent_id: input.subscriptionIntentId ?? null,
      provisioning_job_id: input.provisioningJobId ?? null,
      event_type: input.eventType,
      provider: input.provider ?? null,
      provider_event_id: input.providerEventId ?? null,
      amount: input.amount ?? null,
      currency: input.currency ?? null,
      raw_payload: input.rawPayload ?? null,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to record payment event: ${error.message}`);

  return { success: true, eventId: data.id };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  setCors(res);

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const {
      subscriptionIntentId,
      provisioningJobId,
      eventType,
      provider,
      providerEventId,
      amount,
      currency,
      rawPayload,
    } = req.body ?? {};

    if (!subscriptionIntentId && !provisioningJobId) {
      return res.status(400).json({
        success: false,
        error: 'Either subscriptionIntentId or provisioningJobId is required',
      });
    }

    if (!eventType) {
      return res.status(400).json({
        success: false,
        error: 'eventType is required',
      });
    }

    const result = await recordPaymentEvent({
      subscriptionIntentId,
      provisioningJobId,
      eventType,
      provider,
      providerEventId,
      amount,
      currency,
      rawPayload,
    });

    return res.status(201).json({
      success: true,
      eventId: result.eventId,
      message: 'Payment event recorded',
    });
  } catch (err) {
    console.error('Error recording payment event:', err);
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Internal server error',
    });
  }
}
