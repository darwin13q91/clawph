import { useEffect, useMemo, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import PaymentMethodBadges from './PaymentMethodBadges';
import {
  PAYMENT_METHODS,
  type PaymentMethodId,
  type PricingPlanId,
  type SupportedCurrency,
} from '../config/payments';

interface QuoteResponse {
  success: boolean;
  quote?: {
    planId: PricingPlanId;
    country: string;
    currency: SupportedCurrency;
    displayPrice: string;
    displayFallback: string;
    billingLabel: string;
    acceptedMethods: PaymentMethodId[];
    recommendedMethod: PaymentMethodId;
  };
  error?: string;
}

interface CheckoutResponse {
  success: boolean;
  checkoutRequestId?: string;
  nextStep?: string;
  summary?: {
    planName: string;
    displayPrice: string;
    billingLabel: string;
    paymentMethod: string;
  };
  error?: string;
}

interface AuthUser {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

interface PhilippinesCheckoutPanelProps {
  selectedPlanId: PricingPlanId;
  currency: SupportedCurrency;
  /** Pre-fill form fields from an authenticated Google user */
  prefillUser?: AuthUser;
}

const PLAN_NAMES: Record<PricingPlanId, string> = {
  'openclaw-growth': 'ClawPH Growth',
  'openclaw-setup': 'ClawPH Setup',
};

export default function PhilippinesCheckoutPanel({
  selectedPlanId,
  currency,
  prefillUser,
}: PhilippinesCheckoutPanelProps) {
  const [quote, setQuote] = useState<QuoteResponse['quote']>();
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CheckoutResponse | null>(null);
  const [formData, setFormData] = useState({
    name: prefillUser?.name ?? '',
    email: prefillUser?.email ?? '',
    company: '',
    country: 'Philippines',
    paymentMethod: 'gcash' as PaymentMethodId,
    notes: '',
  });

  // Sync prefillUser changes (e.g., after Google sign-in completes)
  useEffect(() => {
    if (prefillUser) {
      setFormData((current) => ({
        ...current,
        name: prefillUser.name || current.name,
        email: prefillUser.email || current.email,
      }));
    }
  }, [prefillUser]);

  useEffect(() => {
    let cancelled = false;

    const loadQuote = async () => {
      setQuoteLoading(true);
      try {
        const response = await fetch(
          `/api/payments/quote?planId=${selectedPlanId}&country=PH&currency=${currency}`,
        );
        const data = (await response.json()) as QuoteResponse;
        if (!response.ok || !data.success || !data.quote) {
          throw new Error(data.error || 'Failed to load payment quote');
        }
        if (!cancelled) {
          setQuote(data.quote);
          setFormData((current) => ({
            ...current,
            paymentMethod: data.quote?.recommendedMethod ?? current.paymentMethod,
          }));
        }
      } catch (error) {
        if (!cancelled) {
          setQuote(undefined);
          toast.error(error instanceof Error ? error.message : 'Failed to load quote');
        }
      } finally {
        if (!cancelled) {
          setQuoteLoading(false);
        }
      }
    };

    void loadQuote();

    return () => {
      cancelled = true;
    };
  }, [currency, selectedPlanId]);

  const acceptedMethods = useMemo(() => {
    const accepted = new Set(quote?.acceptedMethods ?? PAYMENT_METHODS.map((method) => method.id));
    return PAYMENT_METHODS.filter((method) => accepted.has(method.id));
  }, [quote]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlanId,
          planName: PLAN_NAMES[selectedPlanId],
          preferredCurrency: currency,
          name: formData.name,
          email: formData.email,
          company: formData.company,
          country: formData.country,
          paymentMethod: formData.paymentMethod,
          notes: formData.notes,
        }),
      });

      const data = (await response.json()) as CheckoutResponse;
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create checkout request');
      }

      setResult(data);
      toast.success('PH checkout request created');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Checkout request failed');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPlanName = PLAN_NAMES[selectedPlanId] ?? selectedPlanId;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 items-start">
      <div className="card card-elevated p-6 sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-neon-500/20 bg-neon-500/10 px-4 py-2 mb-5">
          <ShieldCheck size={16} className="text-neon-500" />
          <span className="text-neon-500 text-sm font-mono font-semibold">Philippines payment-ready checkout</span>
        </div>

        <h3 className="font-display text-2xl sm:text-3xl font-black text-warm uppercase tracking-tight mb-3">
          PHP-Native Checkout for Philippine Businesses
        </h3>
        <p className="text-warm-400 leading-relaxed mb-6">
          Get your own OpenClaw AI assistant deployed in the Philippines with
          <span className="text-warm font-medium"> GCash, Maya, QRPH, cards, and bank transfer options</span>.
        </p>

        <PaymentMethodBadges className="mb-6" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="rounded-2xl border border-warm/10 bg-warm/5 p-4">
            <p className="text-warm-400 text-xs uppercase tracking-wider mb-2">Selected plan</p>
            <p className="text-warm font-semibold">{selectedPlanName}</p>
          </div>
          <div className="rounded-2xl border border-warm/10 bg-warm/5 p-4">
            <p className="text-warm-400 text-xs uppercase tracking-wider mb-2">Localized price</p>
            {quoteLoading ? (
              <div className="flex items-center gap-2 text-warm-400 text-sm">
                <Loader2 size={14} className="animate-spin" />
                Loading quote…
              </div>
            ) : quote ? (
              <>
                <p className="text-warm font-semibold">{quote.displayPrice} <span className="text-warm-400 text-sm">{quote.billingLabel}</span></p>
                <p className="text-warm-400 text-xs mt-1">{quote.displayFallback}</p>
              </>
            ) : (
              <p className="text-red-300 text-sm">Quote unavailable</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-warm/10 bg-jungle-900/50 p-4 sm:p-5 mb-6">
          <p className="text-warm font-medium mb-2">Operational behavior</p>
          <ul className="space-y-2 text-sm text-warm-400">
            <li>• Buyers can request PH checkout without switching the whole site to Filipino.</li>
            <li>• Backend receives plan, currency, method, and lead identity in one structured request.</li>
            <li>• If a live provider is connected later, the same endpoint can hand off to PayMongo/Xendit instead of manual follow-up.</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="ph-checkout-name" className="block text-warm-100 text-sm font-medium mb-2">
                Name *
              </label>
              <input
                id="ph-checkout-name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your full name"
                className="input"
                required
              />
            </div>
            <div>
              <label htmlFor="ph-checkout-email" className="block text-warm-100 text-sm font-medium mb-2">
                Email *
              </label>
              <input
                id="ph-checkout-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@company.com"
                className="input"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="ph-checkout-company" className="block text-warm-100 text-sm font-medium mb-2">
                Company
              </label>
              <input
                id="ph-checkout-company"
                name="company"
                value={formData.company}
                onChange={handleChange}
                placeholder="Brand or business name"
                className="input"
              />
            </div>
            <div>
              <label htmlFor="ph-checkout-country" className="block text-warm-100 text-sm font-medium mb-2">
                Billing country
              </label>
              <input
                id="ph-checkout-country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="input"
              />
            </div>
          </div>

          <div>
            <label htmlFor="ph-checkout-method" className="block text-warm-100 text-sm font-medium mb-2">
              Preferred payment method *
            </label>
            <div className="relative">
              <select
                id="ph-checkout-method"
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                className="select"
                required
              >
                {acceptedMethods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="ph-checkout-notes" className="block text-warm-100 text-sm font-medium mb-2">
              Notes for ops (optional)
            </label>
            <textarea
              id="ph-checkout-notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="input min-h-[120px] resize-y"
              placeholder="Invoice preference, company billing details, or rollout timing"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full justify-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Creating checkout request…
              </span>
            ) : (
              'Request PH Checkout'
            )}
          </button>
        </form>
      </div>

      <div className="space-y-5">
        <div className="card p-6">
          <p className="text-warm text-lg font-semibold mb-2">Trust cues to show near checkout</p>
          <ul className="space-y-2 text-sm text-warm-400">
            <li>• Pay with GCash, Maya, QRPH, Visa, Mastercard, or bank transfer</li>
            <li>• Peso pricing first, USD fallback second</li>
            <li>• Secure checkout routing handled server-side</li>
            <li>• Manual confirmation is acceptable now; provider handoff can be switched on later</li>
          </ul>
        </div>

        <div className="card p-6">
          <p className="text-warm text-lg font-semibold mb-2">Recommended next backend step</p>
          <p className="text-sm text-warm-400 leading-relaxed">
            Connect <span className="text-warm font-medium">PayMongo</span> or <span className="text-warm font-medium">Xendit</span> to the same checkout endpoint. Right now the flow is already structured for that handoff.
          </p>
        </div>

        {result && (
          <div className="rounded-3xl border border-neon-500/30 bg-neon-500/10 p-6">
            <p className="text-neon-500 font-mono text-xs uppercase tracking-[0.2em] mb-2">Checkout request created</p>
            <p className="text-warm font-semibold mb-2">Reference: {result.checkoutRequestId}</p>
            {result.summary && (
              <div className="space-y-1 text-sm text-warm-300 mb-3">
                <p>{result.summary.planName}</p>
                <p>{result.summary.displayPrice} {result.summary.billingLabel}</p>
                <p>Preferred method: {result.summary.paymentMethod}</p>
              </div>
            )}
            <p className="text-warm-400 text-sm">
              {result.nextStep ?? 'Ops has the request and can continue the PH checkout flow.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
