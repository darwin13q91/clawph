export type SupportedCurrency = 'USD' | 'PHP';
export type PaymentMethodId = 'gcash' | 'maya' | 'qrph' | 'card' | 'bank_transfer';
export type PricingPlanId = 'openclaw-growth' | 'openclaw-setup';

export const PHP_EXCHANGE_RATE = 57.5;

export interface PlanPricingConfig {
  id: PricingPlanId;
  usdAmount: number;
  billingLabel: string;
  usdSuffix?: string;
  phpRoundedTo?: number;
}

export interface PaymentMethodConfig {
  id: PaymentMethodId;
  label: string;
  shortLabel: string;
  description: string;
  recommended?: boolean;
}

export const PLAN_PRICING: Record<PricingPlanId, PlanPricingConfig> = {
  'openclaw-growth': {
    id: 'openclaw-growth',
    usdAmount: 260,
    billingLabel: '/mo',
    phpRoundedTo: 500,
  },
  'openclaw-setup': {
    id: 'openclaw-setup',
    usdAmount: 1000,
    billingLabel: 'one-time',
    phpRoundedTo: 500,
  },
};

export const PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    id: 'gcash',
    label: 'GCash',
    shortLabel: 'GCash',
    description: 'Most familiar option for Philippines buyers',
    recommended: true,
  },
  {
    id: 'maya',
    label: 'Maya',
    shortLabel: 'Maya',
    description: 'Strong local wallet alternative',
    recommended: true,
  },
  {
    id: 'qrph',
    label: 'QRPH',
    shortLabel: 'QRPH',
    description: 'Local QR standard that signals trust fast',
    recommended: true,
  },
  {
    id: 'card',
    label: 'Visa / Mastercard',
    shortLabel: 'Cards',
    description: 'Fallback for international and business buyers',
  },
  {
    id: 'bank_transfer',
    label: 'Bank Transfer',
    shortLabel: 'Bank',
    description: 'Useful for invoice-first or procurement buyers',
  },
];

export function convertUsdToPhp(amountUsd: number, rate: number = PHP_EXCHANGE_RATE, roundedTo: number = 50): number {
  const converted = amountUsd * rate;
  return Math.round(converted / roundedTo) * roundedTo;
}

export function formatCurrency(amount: number, currency: SupportedCurrency): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'PHP' ? 0 : 2,
    minimumFractionDigits: currency === 'PHP' ? 0 : 0,
  }).format(amount);
}

export function getLocalizedPlanPrice(planId: PricingPlanId, currency: SupportedCurrency) {
  const config = PLAN_PRICING[planId];
  const phpAmount = convertUsdToPhp(config.usdAmount, PHP_EXCHANGE_RATE, config.phpRoundedTo ?? 50);
  const usdFormatted = formatCurrency(config.usdAmount, 'USD');
  const phpFormatted = formatCurrency(phpAmount, 'PHP');

  if (currency === 'PHP') {
    return {
      primary: phpFormatted,
      secondary: `(~${usdFormatted} USD)`,
      billingLabel: config.billingLabel,
      rawAmount: phpAmount,
      currency,
    };
  }

  return {
    primary: usdFormatted,
    secondary: `(~${phpFormatted})`,
    billingLabel: config.billingLabel,
    rawAmount: config.usdAmount,
    currency,
  };
}
