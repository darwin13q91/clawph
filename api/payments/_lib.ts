import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

export type SupportedCurrency = 'USD' | 'PHP';
export type PricingPlanId = 'openclaw-growth' | 'openclaw-setup';
export type PaymentMethodId = 'gcash' | 'maya' | 'qrph' | 'card' | 'bank_transfer';

export const PHP_EXCHANGE_RATE = Number(process.env.PHP_USD_EXCHANGE_RATE || '57.5');

export const PLAN_PRICING = {
  'openclaw-growth': {
    name: 'ClawPH Growth',
    usdAmount: 260,
    phpRoundedTo: 500,
    billingLabel: '/mo',
  },
  'openclaw-setup': {
    name: 'ClawPH Setup',
    usdAmount: 1000,
    phpRoundedTo: 500,
    billingLabel: 'one-time',
  },
} satisfies Record<PricingPlanId, { name: string; usdAmount: number; phpRoundedTo: number; billingLabel: string }>;

export const PAYMENT_METHODS = {
  gcash: 'GCash',
  maya: 'Maya',
  qrph: 'QRPH',
  card: 'Visa / Mastercard',
  bank_transfer: 'Bank Transfer',
} satisfies Record<PaymentMethodId, string>;

export function setCors(res: VercelResponse, origin?: string) {
  res.setHeader('Access-Control-Allow-Origin', origin ?? '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-provider-signature');
}

export function handleOptions(req: VercelRequest, res: VercelResponse): boolean {
  setCors(res, req.headers.origin);
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

export function convertUsdToPhp(amountUsd: number): number {
  return Math.round((amountUsd * PHP_EXCHANGE_RATE) / 50) * 50;
}

export function formatCurrency(amount: number, currency: SupportedCurrency): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'PHP' ? 0 : 2,
    minimumFractionDigits: currency === 'PHP' ? 0 : 0,
  }).format(amount);
}

export function getQuote(planId: PricingPlanId, currency: SupportedCurrency = 'PHP') {
  const plan = PLAN_PRICING[planId];
  const phpAmount = convertUsdToPhp(plan.usdAmount);

  if (currency === 'PHP') {
    return {
      planId,
      planName: plan.name,
      country: 'PH',
      currency,
      displayPrice: formatCurrency(phpAmount, 'PHP'),
      displayFallback: `~${formatCurrency(plan.usdAmount, 'USD')} USD`,
      billingLabel: plan.billingLabel,
      acceptedMethods: ['gcash', 'maya', 'qrph', 'card', 'bank_transfer'] as PaymentMethodId[],
      recommendedMethod: 'gcash' as PaymentMethodId,
    };
  }

  return {
    planId,
    planName: plan.name,
    country: 'PH',
    currency,
    displayPrice: formatCurrency(plan.usdAmount, 'USD'),
    displayFallback: `~${formatCurrency(phpAmount, 'PHP')}`,
    billingLabel: plan.billingLabel,
    acceptedMethods: ['card', 'gcash', 'maya', 'qrph', 'bank_transfer'] as PaymentMethodId[],
    recommendedMethod: 'card' as PaymentMethodId,
  };
}

export function badRequest(res: VercelResponse, error: string, status: number = 400, origin?: string) {
  setCors(res, origin);
  return res.status(status).json({ success: false, error });
}

export function createCheckoutRequestId() {
  return `PH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

interface CheckoutPayload {
  planId: PricingPlanId;
  planName?: string;
  preferredCurrency?: SupportedCurrency;
  name: string;
  email: string;
  company?: string;
  country?: string;
  paymentMethod: PaymentMethodId;
  notes?: string;
}

export function validateCheckoutPayload(payload: Partial<CheckoutPayload>, isAuthenticated = false) {
  if (!payload.planId || !(payload.planId in PLAN_PRICING)) {
    return 'Invalid planId';
  }
  // If authenticated via Google, name/email come from verified session — form submission is optional enrichment
  if (!isAuthenticated) {
    if (!payload.name?.trim()) {
      return 'Name is required';
    }
    if (!payload.email?.trim()) {
      return 'Email is required';
    }
  }
  if (!payload.paymentMethod || !(payload.paymentMethod in PAYMENT_METHODS)) {
    return 'Invalid payment method';
  }
  return null;
}

export async function sendCheckoutNotification(payload: CheckoutPayload & { checkoutRequestId: string; authenticated?: boolean }) {
  const recipient = process.env.PAYMENT_NOTIFICATION_EMAIL || process.env.OPS_EMAIL || 'hello@clawph.com';
  const from = process.env.PAYMENT_FROM_EMAIL || process.env.HELLO_EMAIL || 'hello@clawph.com';
  const quote = getQuote(payload.planId, payload.preferredCurrency ?? 'PHP');
  const authBadge = payload.authenticated ? ' [GOOGLE VERIFIED]' : '';

  const subject = `[PH Checkout] ${payload.checkoutRequestId}${authBadge} — ${PLAN_PRICING[payload.planId].name}`;
  const text = [
    'New Philippines checkout request',
    '',
    `Reference: ${payload.checkoutRequestId}`,
    `Authentication: ${payload.authenticated ? 'Google Verified' : 'Form submitted (unauthenticated)'}`,
    `Plan: ${PLAN_PRICING[payload.planId].name}`,
    `Display price: ${quote.displayPrice} ${quote.billingLabel}`,
    `Fallback: ${quote.displayFallback}`,
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    `Company: ${payload.company || '-'}`,
    `Country: ${payload.country || 'Philippines'}`,
    `Preferred payment method: ${PAYMENT_METHODS[payload.paymentMethod]}`,
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
        <p><strong>Plan:</strong> ${PLAN_PRICING[payload.planId].name}</p>
        <p><strong>Display price:</strong> ${quote.displayPrice} ${quote.billingLabel}</p>
        <p><strong>Fallback:</strong> ${quote.displayFallback}</p>
        <p><strong>Name:</strong> ${payload.name}</p>
        <p><strong>Email:</strong> ${payload.email}</p>
        <p><strong>Company:</strong> ${payload.company || '-'}</p>
        <p><strong>Country:</strong> ${payload.country || 'Philippines'}</p>
        <p><strong>Preferred payment method:</strong> ${PAYMENT_METHODS[payload.paymentMethod]}</p>
        <p><strong>Notes:</strong> ${payload.notes || '-'}</p>
      </div>`,
    });
    return 'resend';
  }

  const externalEmailApi = process.env.EMAIL_API_URL || 'https://clawph-email-api.vercel.app/api/send-email';
  if (externalEmailApi) {
    const response = await fetch(externalEmailApi, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: recipient,
        subject,
        text,
        html: `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap">${text}</pre>`,
      }),
    });

    if (response.ok) {
      return 'email-api';
    }
  }

  console.log(subject, text);
  return 'console';
}
