/**
 * AuthGateCheckout — 3-step guided checkout flow.
 *
 * Step 1: Plan summary shown before sign-in
 * Step 2: Google sign-in with clear explanation
 * Step 3: Checkout form with post-auth framing
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, LogOut, CheckCircle, Lock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import GoogleSignIn from './GoogleSignIn';
import PhilippinesCheckoutPanel from './PhilippinesCheckoutPanel';
import { getLocalizedPlanPrice, type PricingPlanId, type SupportedCurrency } from '../config/payments';

interface AuthUser {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

const PLAN_NAMES: Record<PricingPlanId, string> = {
  'openclaw-growth': 'ClawPH Growth',
  'openclaw-setup': 'ClawPH Setup',
};

const PLAN_PRICES: Record<PricingPlanId, { price: string; sub: string }> = {
  'openclaw-growth': { price: '₱15,000', sub: '/month' },
  'openclaw-setup': { price: '₱57,500', sub: 'one-time' },
};

type Step = 'plan-summary' | 'sign-in' | 'checkout';

export default function AuthGateCheckout({
  selectedPlanId,
  currency,
}: {
  selectedPlanId: PricingPlanId;
  currency: SupportedCurrency;
}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>('plan-summary');
  const googleButtonRef = useRef<HTMLDivElement>(null);

  // Check existing session on mount
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/auth/session', { credentials: 'include' });
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user as AuthUser);
          setCurrentStep('checkout');
        }
      } catch {
        // Session check fails silently — user starts at plan summary
      } finally {
        setLoading(false);
      }
    };
    void check();
  }, []);

  const handleGoogleSuccess = useCallback(async (credential: string) => {
    setAuthenticating(true);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? 'Sign-in failed');
      }
      setUser(data.user as AuthUser);
      setCurrentStep('checkout');
      toast.success(`Signed in as ${data.user.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setAuthenticating(false);
    }
  }, []);

  const handleGoogleError = useCallback((msg: string) => {
    toast.error(msg);
    setAuthenticating(false);
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'DELETE', credentials: 'include' });
      setUser(null);
      setCurrentStep('plan-summary');
      toast.success('Signed out');
    } catch {
      toast.error('Sign-out failed');
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-neon-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {(['plan-summary', 'sign-in', 'checkout'] as Step[]).map((step, i) => {
          const labels: Record<Step, string> = {
            'plan-summary': '1. Plan',
            'sign-in': '2. Sign in',
            'checkout': '3. Checkout',
          };
          const isActive = currentStep === step;
          const isPast =
            (step === 'plan-summary' && (currentStep === 'sign-in' || currentStep === 'checkout')) ||
            (step === 'sign-in' && currentStep === 'checkout');

          return (
            <div key={step} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-semibold transition-colors ${
                  isActive
                    ? 'bg-neon-500/15 text-neon-500 border border-neon-500/30'
                    : isPast
                    ? 'bg-neon-500/5 text-neon-500/70 border border-neon-500/15'
                    : 'bg-warm/5 text-warm-400 border border-warm/10'
                }`}
              >
                {isPast ? (
                  <CheckCircle size={12} />
                ) : (
                  <span className="w-4 h-4 rounded-full bg-current opacity-30 flex items-center justify-center text-[9px] font-black">
                    {i + 1}
                  </span>
                )}
                {labels[step]}
              </div>
              {i < 2 && (
                <div className={`w-6 h-px ${isPast ? 'bg-neon-500/30' : 'bg-warm/10'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Step 1: Plan summary ── */}
      <AnimatePresence mode="wait">
        {currentStep === 'plan-summary' && (
          <motion.div
            key="plan-summary"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-warm/10 bg-warm/3 p-6"
          >
            <p className="text-warm-400 text-xs font-mono uppercase tracking-widest mb-4">
              Your selected plan
            </p>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-warm font-semibold text-lg">
                  {PLAN_NAMES[selectedPlanId]}
                </p>
                <p className="text-warm-400 text-sm mt-0.5">
                  {PLAN_PRICES[selectedPlanId].price}{' '}
                  <span className="text-xs">{PLAN_PRICES[selectedPlanId].sub}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-neon-500 text-sm font-semibold">
                  {getLocalizedPlanPrice(selectedPlanId, currency).primary}
                </p>
                <p className="text-warm-400 text-xs">
                  {getLocalizedPlanPrice(selectedPlanId, currency).billingLabel}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-jungle-900/60 border border-warm/10 p-4 mb-5">
              <p className="text-warm-400 text-xs leading-relaxed">
                <span className="text-warm font-medium">What happens next:</span>{' '}
                You&apos;ll be asked to sign in with Google, then fill out a short checkout form.
                We&apos;ll confirm your request and send payment details via email within 24 hours.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCurrentStep('sign-in')}
              className="btn btn-primary w-full justify-center"
            >
              Continue to Sign In
              <ArrowRight size={16} className="ml-2" />
            </button>
          </motion.div>
        )}

        {/* ── Step 2: Sign in ── */}
        {currentStep === 'sign-in' && (
          <motion.div
            key="sign-in"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-warm/10 bg-warm/3 p-6 sm:p-8 text-center space-y-6"
          >
            <div className="space-y-2">
              <p className="font-display text-xl font-black text-warm tracking-tight">
                Sign in to continue
              </p>
              <p className="text-warm-400 text-sm max-w-sm mx-auto">
                We use Google sign-in to verify your identity and pre-fill your checkout details.
              </p>
            </div>

            {/* Plan reminder */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-warm/5 border border-warm/10">
              <span className="text-warm-400 text-xs">Selected:</span>
              <span className="text-warm font-semibold text-sm">
                {PLAN_NAMES[selectedPlanId]}
              </span>
              <span className="text-neon-500 text-xs font-semibold">
                {PLAN_PRICES[selectedPlanId].price}
              </span>
            </div>

            {/* Why Google sign-in */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-jungle-900/60 border border-warm/10 text-left">
              <Lock size={15} className="text-warm-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-warm text-sm font-medium mb-1">Why do we ask for this?</p>
                <p className="text-warm-400 text-xs leading-relaxed">
                  Google sign-in confirms your identity so we know who&apos;s requesting checkout.
                  Your email is pre-filled automatically — no typing required. No password needed.
                  You&apos;ll get an email confirmation with payment instructions after.
                </p>
              </div>
            </div>

            {authenticating ? (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 size={20} className="animate-spin text-neon-500" />
                <span className="text-warm-400 text-sm">Signing you in…</span>
              </div>
            ) : (
              <div className="max-w-sm mx-auto">
                <GoogleSignIn
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  mode="signin"
                  containerRef={googleButtonRef}
                  fallbackText="Sign in with Google"
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => setCurrentStep('plan-summary')}
              className="text-warm-400 hover:text-warm text-sm transition-colors"
            >
              ← Back to plan summary
            </button>
          </motion.div>
        )}

        {/* ── Step 3: Checkout ── */}
        {currentStep === 'checkout' && (
          <motion.div
            key="checkout"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* Verified identity banner */}
            <div className="flex items-center gap-3 p-4 rounded-2xl border border-neon-500/30 bg-neon-500/5">
              {user?.picture ? (
                <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-neon-500/20 flex items-center justify-center">
                  <CheckCircle size={20} className="text-neon-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-warm font-semibold text-sm truncate">{user?.name}</p>
                <p className="text-warm-400 text-xs truncate">{user?.email}</p>
                <p className="text-neon-500 text-xs font-mono mt-0.5">✓ Google Verified</p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 text-warm-400 hover:text-warm text-sm transition-colors"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>

            {/* What happens after */}
            <div className="rounded-xl bg-neon-500/5 border border-neon-500/15 p-4 text-left">
              <p className="text-neon-500 text-xs font-mono font-semibold tracking-widest uppercase mb-2">
                After you submit
              </p>
              <p className="text-warm-400 text-sm leading-relaxed">
                We&apos;ll confirm your request and email you payment details (GCash, Maya, bank transfer, or card)
                within 24 hours. No immediate payment required. We&apos;ll schedule your setup call once payment is confirmed.
              </p>
            </div>

            {/* Checkout panel */}
            <PhilippinesCheckoutPanelWithAuth
              selectedPlanId={selectedPlanId}
              currency={currency}
              authenticatedUser={user!}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Checkout panel with pre-filled user ───────────────────────────

function PhilippinesCheckoutPanelWithAuth({
  selectedPlanId,
  currency,
  authenticatedUser,
}: {
  selectedPlanId: PricingPlanId;
  currency: SupportedCurrency;
  authenticatedUser: AuthUser;
}) {
  return (
    <PhilippinesCheckoutPanel
      selectedPlanId={selectedPlanId}
      currency={currency}
      prefillUser={authenticatedUser}
    />
  );
}
