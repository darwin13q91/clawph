/**
 * AuthGateCheckout — 4-step guided checkout flow.
 *
 * Step 1: Plan summary shown before sign-in
 * Step 2: Google sign-in with clear explanation
 * Step 3: Personalized preview / readiness framing
 * Step 4: Checkout form with post-auth framing
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, LogOut, CheckCircle, Lock, ArrowRight, Bot, CreditCard, Settings2 } from 'lucide-react';
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

const PLAN_PREVIEW_POINTS: Record<PricingPlanId, string[]> = {
  'openclaw-growth': [
    'Monthly optimization for your OpenClaw setup and workflows',
    'Priority help refining prompts, automations, and routing',
    'Ongoing support so the system stays useful instead of becoming expensive wallpaper',
  ],
  'openclaw-setup': [
    'Initial OpenClaw installation and environment setup',
    'Core channel, memory, and agent configuration for your use case',
    'A guided onboarding path so you know what to use on day one',
  ],
};

type Step = 'plan-summary' | 'sign-in' | 'preview' | 'checkout';

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
  const flowCardRef = useRef<HTMLDivElement>(null);

  // Check existing session on mount
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/auth/session', { credentials: 'include' });
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user as AuthUser);
          setCurrentStep('preview');
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
      setCurrentStep('preview');
      toast.success('Google verified — next step: preview your setup path');
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

  useEffect(() => {
    flowCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [currentStep]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-neon-500" />
      </div>
    );
  }

  return (
    <div ref={flowCardRef} className="space-y-4">
      {/* Step indicator */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
        {(['plan-summary', 'sign-in', 'preview', 'checkout'] as Step[]).map((step, i, allSteps) => {
          const labels: Record<Step, string> = {
            'plan-summary': '1. Plan',
            'sign-in': '2. Sign in',
            'preview': '3. Preview',
            'checkout': '4. Checkout',
          };
          const currentIndex = allSteps.indexOf(currentStep);
          const stepIndex = allSteps.indexOf(step);
          const isActive = currentStep === step;
          const isPast = stepIndex < currentIndex;

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
              {i < allSteps.length - 1 && (
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
                You&apos;ll sign in with Google, complete a short checkout request, and then we&apos;ll
                send payment details by email within 24 hours. Your OpenClaw setup starts only after
                payment is confirmed.
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
                This step does not install anything yet — it just unlocks checkout.
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              <div className="rounded-xl border border-warm/10 bg-warm/5 p-3">
                <p className="text-xs font-mono text-neon-500 mb-1">After you tap Google</p>
                <p className="text-sm text-warm-300">1. Verify your Google account</p>
              </div>
              <div className="rounded-xl border border-warm/10 bg-warm/5 p-3">
                <p className="text-xs font-mono text-neon-500 mb-1">Then</p>
                <p className="text-sm text-warm-300">2. You&apos;ll see a quick setup preview</p>
              </div>
              <div className="rounded-xl border border-warm/10 bg-warm/5 p-3">
                <p className="text-xs font-mono text-neon-500 mb-1">Later</p>
                <p className="text-sm text-warm-300">3. Checkout comes next, installation later</p>
              </div>
            </div>

            {authenticating ? (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 size={20} className="animate-spin text-neon-500" />
                <span className="text-warm-400 text-sm">Signing you in…</span>
              </div>
            ) : (
              <div className="max-w-sm mx-auto space-y-3">
                <GoogleSignIn
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  mode="signin"
                  containerRef={googleButtonRef}
                  fallbackText="Sign in with Google"
                />
                <p className="text-xs text-warm-400">
                  You&apos;ll be moved to <span className="text-warm font-medium">Step 3: Preview</span>{' '}
                  immediately after a successful Google sign-in.
                </p>
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

        {/* ── Step 3: Preview ── */}
        {currentStep === 'preview' && user && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="rounded-2xl border border-neon-500/20 bg-neon-500/5 p-5">
              <p className="text-neon-500 text-xs font-mono uppercase tracking-[0.2em] mb-2">
                Preview unlocked
              </p>
              <p className="text-warm font-semibold text-xl">Good. You&apos;re verified, {user.name.split(' ')[0]}.</p>
              <p className="text-warm-400 text-sm mt-1 leading-relaxed">
                Before checkout, here&apos;s the version that matters: you&apos;re not starting installation yet.
                You&apos;re confirming what happens after payment so nobody confuses a sign-in with a deployment.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-warm/10 bg-warm/5 p-4">
                <Bot size={18} className="text-neon-500 mb-3" />
                <p className="text-warm font-semibold mb-2">What this plan includes</p>
                <ul className="space-y-2 text-sm text-warm-400">
                  {PLAN_PREVIEW_POINTS[selectedPlanId].map((point) => (
                    <li key={point}>• {point}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-warm/10 bg-warm/5 p-4">
                <Settings2 size={18} className="text-neon-500 mb-3" />
                <p className="text-warm font-semibold mb-2">What happens after payment</p>
                <ul className="space-y-2 text-sm text-warm-400">
                  <li>• We confirm your request and setup scope</li>
                  <li>• We schedule onboarding / installation steps</li>
                  <li>• We begin the actual OpenClaw setup with your approved details</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-warm/10 bg-warm/5 p-4">
                <CreditCard size={18} className="text-neon-500 mb-3" />
                <p className="text-warm font-semibold mb-2">What checkout does now</p>
                <ul className="space-y-2 text-sm text-warm-400">
                  <li>• Saves your verified identity and plan choice</li>
                  <li>• Sends payment details to your email</li>
                  <li>• Starts the paid handoff — not the install itself</li>
                </ul>
              </div>
            </div>

            <div className="rounded-2xl border border-warm/10 bg-jungle-900/60 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-warm font-semibold">Ready to continue?</p>
                <p className="text-warm-400 text-sm">
                  Next step: submit the checkout request so payment instructions can go out.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="btn btn-secondary justify-center"
                >
                  Sign out
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep('checkout')}
                  className="btn btn-primary justify-center"
                >
                  Continue to Checkout
                  <ArrowRight size={16} className="ml-2" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Step 4: Checkout ── */}
        {currentStep === 'checkout' && (
          <motion.div
            key="checkout"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="rounded-2xl border border-neon-500/20 bg-neon-500/5 p-4">
              <p className="text-neon-500 text-xs font-mono uppercase tracking-[0.2em] mb-2">
                Step 4 of 4
              </p>
              <p className="text-warm font-semibold text-lg">Submit your checkout request</p>
              <p className="text-warm-400 text-sm mt-1">
                You&apos;re signed in. This form creates your checkout request and triggers payment details.
                Your OpenClaw installation starts after payment confirmation.
              </p>
            </div>
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
