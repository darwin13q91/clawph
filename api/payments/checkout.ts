import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSessionFromRequest } from '../auth/_lib';
import {
  PAYMENT_METHODS,
  PLAN_PRICING,
  badRequest,
  createCheckoutRequestId,
  convertUsdToPhp,
  formatCurrency,
  handleOptions,
  setCors,
  validateCheckoutPayload,
} from './_lib';

// Import persistence layer (only when Supabase env vars are set)
let persistCheckout: typeof import('../../src/lib/db-persistence').persistCheckout | null = null;

async function getPersistCheckout() {
  if (persistCheckout) return persistCheckout;
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return null;
  try {
    const mod = await import('../../src/lib/db-persistence');
    persistCheckout = mod.persistCheckout;
    return persistCheckout;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  setCors(res);

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return badRequest(res, 'Method not allowed', 405);
  }

  // Get authenticated session (if any) — authenticated identity takes priority
  const session = await getSessionFromRequest(req);

  const payload = req.body ?? {};
  const validationError = validateCheckoutPayload(payload, !!session);
  if (validationError) {
    return badRequest(res, validationError);
  }

  // If authenticated, prefer session identity over form-submitted name/email
  const verifiedName = session?.name ?? payload.name;
  const verifiedEmail = session?.email ?? payload.email;

  const checkoutRequestId = createCheckoutRequestId();

  // Build quote for summary
  const plan = PLAN_PRICING[payload.planId as keyof typeof PLAN_PRICING];
  const currency = payload.preferredCurrency === 'USD' ? 'USD' : 'PHP';
  const phpAmount = convertUsdToPhp(plan.usdAmount);
  const displayPrice = currency === 'PHP'
    ? formatCurrency(phpAmount, 'PHP')
    : formatCurrency(plan.usdAmount, 'USD');

  // ── Persist to Supabase ─────────────────────────────────────────────────
  const doPersist = await getPersistCheckout();

  if (doPersist) {
    try {
      await doPersist({
        session,
        checkoutRequestId,
        planId: payload.planId,
        planName: plan.name,
        billingLabel: plan.billingLabel,
        currency,
        amountLocal: currency === 'PHP' ? phpAmount : plan.usdAmount,
        amountUsd: currency === 'PHP' ? plan.usdAmount : undefined,
        paymentMethodId: payload.paymentMethod,
        customerName: verifiedName,
        customerEmail: verifiedEmail,
        customerCompany: payload.company,
        customerCountry: payload.country,
        notes: payload.notes,
      });
      console.log(`[persistence] checkout ${checkoutRequestId} saved to Supabase`);
    } catch (err) {
      // Log but don't fail the request — DB is source of truth, email is fallback
      console.error('[persistence] Failed to save checkout to Supabase:', err);
    }
  } else {
    console.log(`[persistence] Supabase not configured — skipping DB write for ${checkoutRequestId}`);
  }

  // ── Notify ops (keep existing email/console notification) ──────────────
  let notificationChannel = 'console';
  try {
    notificationChannel = await sendCheckoutNotification({
      planId: payload.planId,
      preferredCurrency: payload.preferredCurrency,
      name: verifiedName,
      email: verifiedEmail,
      company: payload.company,
      country: payload.country,
      paymentMethod: payload.paymentMethod,
      notes: payload.notes,
      checkoutRequestId,
      authenticated: !!session,
    });
  } catch (error) {
    console.error('Checkout notification failed:', error);
  }

  return res.status(200).json({
    success: true,
    checkoutRequestId,
    authenticated: !!session,
    persisted: doPersist !== null,
    nextStep:
      'Ops has the request. For now this routes through PH payment-ready operations and can later hand off to PayMongo/Xendit without changing the frontend.',
    summary: {
      planName: plan.name,
      displayPrice,
      billingLabel: plan.billingLabel,
      paymentMethod: PAYMENT_METHODS[payload.paymentMethod],
      name: verifiedName,
      email: verifiedEmail,
    },
    routing: {
      mode: process.env.PAYMENT_PROVIDER || 'manual',
      notificationChannel,
    },
  });
}

// ── Notification (moved from _lib.ts to keep that file clean) ────────────────

import { Resend } from 'resend';

async function sendCheckoutNotification(payload: {
  planId: string;
  preferredCurrency?: string;
  name: string;
  email: string;
  company?: string;
  country?: string;
  paymentMethod: string;
  notes?: string;
  checkoutRequestId: string;
  authenticated?: boolean;
}): Promise<string> {
  const recipient = process.env.PAYMENT_NOTIFICATION_EMAIL || process.env.OPS_EMAIL || 'hello@clawph.com';
  const from = process.env.PAYMENT_FROM_EMAIL || process.env.HELLO_EMAIL || 'hello@clawph.com';
  const plan = PLAN_PRICING[payload.planId as keyof typeof PLAN_PRICING];
  const currency = payload.preferredCurrency === 'USD' ? 'USD' : 'PHP';
  const phpAmount = convertUsdToPhp(plan.usdAmount);
  const displayPrice = currency === 'PHP'
    ? formatCurrency(phpAmount, 'PHP')
    : formatCurrency(plan.usdAmount, 'USD');
  const displayFallback = currency === 'PHP'
    ? `~${formatCurrency(plan.usdAmount, 'USD')} USD`
    : `~${formatCurrency(phpAmount, 'PHP')}`;
  const authBadge = payload.authenticated ? ' [GOOGLE VERIFIED]' : '';

  const subject = `[PH Checkout] ${payload.checkoutRequestId}${authBadge} — ${plan.name}`;
  const text = [
    'New Philippines checkout request',
    '',
    `Reference: ${payload.checkoutRequestId}`,
    `Authentication: ${payload.authenticated ? 'Google Verified' : 'Form submitted (unauthenticated)'}`,
    `Plan: ${plan.name}`,
    `Display price: ${displayPrice} ${plan.billingLabel}`,
    `Fallback: ${displayFallback}`,
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    `Company: ${payload.company || '-'}`,
    `Country: ${payload.country || 'Philippines'}`,
    `Preferred payment method: ${PAYMENT_METHODS[payload.paymentMethod as keyof typeof PAYMENT_METHODS] ?? payload.paymentMethod}`,
    `Notes: ${payload.notes || '-'}`,
  ].join('\n');

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from,
      to: recipient,
      subject,
      text,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2>New Philippines checkout request</h2>
        <p><strong>Reference:</strong> ${payload.checkoutRequestId}</p>
        <p><strong>Plan:</strong> ${plan.name}</p>
        <p><strong>Display price:</strong> ${displayPrice} ${plan.billingLabel}</p>
        <p><strong>Fallback:</strong> ${displayFallback}</p>
        <p><strong>Name:</strong> ${payload.name}</p>
        <p><strong>Email:</strong> ${payload.email}</p>
        <p><strong>Company:</strong> ${payload.company || '-'}</p>
        <p><strong>Country:</strong> ${payload.country || 'Philippines'}</p>
        <p><strong>Preferred payment method:</strong> ${PAYMENT_METHODS[payload.paymentMethod as keyof typeof PAYMENT_METHODS] ?? payload.paymentMethod}</p>
        <p><strong>Notes:</strong> ${payload.notes || '-'}</p>
      </div>`,
    });
    return 'resend';
  }

  console.log(subject, text);
  return 'console';
}
