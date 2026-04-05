/**
 * PricingPage — ClawPH landing page, redesigned for conversion.
 *
 * Page structure (top to bottom):
 *  1. Sticky header / top nav
 *  2. Hero — who it's for / what it does / why it matters
 *  3. How it works (3 steps)
 *  4. Use cases — who it's for
 *  5. Why ClawPH vs DIY / generic AI
 *  6. Pricing cards
 *  7. Checkout
 *  8. Guarantee
 *  9. FAQ
 * 10. Final CTA
 */
import { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Sparkles,
  Check,
  Bot,
  Users,
} from 'lucide-react';

// Components
import LandingHeader from '../components/LandingHeader';
import TrustStrip from '../components/TrustStrip';
import HowItWorksSection from '../components/HowItWorksSection';
import UseCasesSection from '../components/UseCasesSection';
import WhyClawPHSection from '../components/WhyClawPHSection';
import GuaranteeSection from '../components/GuaranteeSection';
import FAQSection from '../components/FAQSection';
import AuthGateCheckout from '../components/AuthGateCheckout';
import {
  getLocalizedPlanPrice,
  type PricingPlanId,
  type SupportedCurrency,
} from '../config/payments';

// ── Types ──────────────────────────────────────────────────────────

type BadgeStyle = 'popular' | 'value';

interface PricingTier {
  id: 'openclaw-growth' | 'openclaw-setup';
  variant: 'primary' | 'secondary';
  icon: React.ComponentType<{ size?: number; className?: string }>;
  name: string;
  tagline: string;
  price: string;
  priceSubtext?: string;
  badge: string;
  badgeStyle: BadgeStyle;
  features: string[];
  ctaLabel: string;
  highlightColor: 'neon' | 'violet';
}

// ── Static Data ────────────────────────────────────────────────────

const PRICING_TIERS: PricingTier[] = [
  {
    id: 'openclaw-growth',
    variant: 'primary',
    icon: Users,
    name: 'ClawPH Growth',
    tagline: 'Ongoing support & optimization',
    price: '₱15,000',
    priceSubtext: '/mo',
    badge: 'Most Popular',
    badgeStyle: 'popular',
    features: [
      'Full OpenClaw platform management',
      'Weekly strategy & performance reviews',
      'Custom workflow optimization',
      'Priority Telegram support channel',
      'Monthly 1:1 consultation call',
      'New feature onboarding included',
      'Cancel anytime — 30-day notice',
    ],
    ctaLabel: 'Start Growth Plan',
    highlightColor: 'neon',
  },
  {
    id: 'openclaw-setup',
    variant: 'secondary',
    icon: Bot,
    name: 'ClawPH Setup',
    tagline: 'One-time setup — you own it forever',
    price: '₱57,500',
    priceSubtext: ' one-time',
    badge: 'Best Value',
    badgeStyle: 'value',
    features: [
      'Complete OpenClaw installation',
      'Telegram, Discord & WhatsApp setup',
      '5 custom workflows configured',
      '48-hour white-glove deployment',
      'Your infrastructure, your data',
      '30-day money-back guarantee',
      'Free 1-hour training session',
    ],
    ctaLabel: 'Book Setup Call',
    highlightColor: 'violet',
  },
];

// ── Animation Variants ────────────────────────────────────────────

const fadeUpVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

// ── Pricing Card ──────────────────────────────────────────────────

function PricingCard({
  tier,
  index,
  currency,
  onRequestCheckout,
}: {
  tier: PricingTier;
  index: number;
  currency: SupportedCurrency;
  onRequestCheckout: (planId: PricingPlanId) => void;
}) {
  const isPrimary = tier.variant === 'primary';
  const Icon = tier.icon;
  const localizedPrice = getLocalizedPlanPrice(tier.id, currency);

  const badgeBg = isPrimary
    ? 'bg-neon-500/10 border border-neon-500/30'
    : 'bg-violet-500/10 border border-violet-500/30';
  const badgeText = isPrimary ? 'text-neon-500' : 'text-violet-400';

  const cardClasses = isPrimary
    ? 'relative rounded-3xl ring-2 ring-neon-500 bg-gradient-to-b from-neon-500/5 to-transparent border border-neon-500/30 p-8 lg:p-10'
    : 'relative rounded-3xl bg-warm/5 border border-warm/10 hover:border-warm/20 transition-colors p-8 lg:p-10';

  const priceColor = isPrimary ? 'text-neon-500' : 'text-warm';
  const glowShadow = isPrimary
    ? 'shadow-[0_0_40px_rgba(207,255,0,0.12)]'
    : 'shadow-none';

  return (
    <motion.div
      variants={fadeUpVariants}
      custom={0.1 + index * 0.15}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3 }}
      className={`relative ${cardClasses} ${glowShadow}`}
    >
      {/* Badge */}
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
        <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full ${badgeBg}`}>
          {isPrimary && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-neon-500" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-500" />
            </span>
          )}
          {!isPrimary && <span className="text-violet-400 text-sm">⚡</span>}
          <span className={`font-mono text-xs font-bold tracking-widest ${badgeText}`}>
            {tier.badge}
          </span>
        </div>
      </div>

      {/* Icon */}
      <div className="w-14 h-14 rounded-2xl bg-warm/10 flex items-center justify-center mb-6 mt-2">
        <Icon className={isPrimary ? 'text-neon-500' : 'text-violet-400'} size={28} />
      </div>

      {/* Name & Tagline */}
      <h3 className="font-display text-2xl font-black text-warm tracking-tight mb-1">
        {tier.name}
      </h3>
      <p className={`text-sm font-mono mb-6 ${isPrimary ? 'text-neon-500' : 'text-violet-400'}`}>
        {tier.tagline}
      </p>

      {/* Price */}
      <div className="mb-8">
        <div className="flex flex-wrap items-end gap-2">
          <span className={`font-mono text-5xl font-bold ${priceColor}`}>
            {localizedPrice.primary}
          </span>
          <span className="text-warm-400 text-sm">{localizedPrice.billingLabel}</span>
        </div>
        <p className="text-warm-400 text-xs mt-2 font-mono">
          {localizedPrice.secondary}
        </p>
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-8">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <Check
              size={16}
              className={
                isPrimary
                  ? 'text-neon-500 flex-shrink-0 mt-0.5'
                  : 'text-violet-400 flex-shrink-0 mt-0.5'
              }
            />
            <span className="text-warm-400 text-sm leading-relaxed">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <button
        type="button"
        onClick={() => onRequestCheckout(tier.id)}
        className={`btn w-full justify-center ${isPrimary ? 'btn-primary' : 'btn-secondary'}`}
      >
        {tier.ctaLabel}
      </button>
    </motion.div>
  );
}

// ── Pricing Section ───────────────────────────────────────────────

function PricingSection({
  selectedPlanId,
  onSelectPlan,
}: {
  selectedPlanId: PricingPlanId;
  onSelectPlan: (id: PricingPlanId) => void;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [currency, setCurrency] = useState<SupportedCurrency>('PHP');

  return (
    <section id="pricing" className="py-20 lg:py-28" ref={ref}>
      <div className="container-base">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <p className="text-neon-500 text-sm font-mono font-semibold tracking-widest uppercase mb-3">
            Simple pricing
          </p>
          <h2 className="font-display text-3xl lg:text-5xl font-black text-warm tracking-tight leading-tight">
            Choose your plan
          </h2>
          <p className="text-warm-400 text-lg mt-4 max-w-xl mx-auto">
            No hidden fees. No contracts. Pick the plan that matches where you are.
          </p>
        </motion.div>

        {/* Currency toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center rounded-full border border-warm/10 bg-jungle-800/80 p-1">
            {(['PHP', 'USD'] as SupportedCurrency[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setCurrency(option)}
                className={`rounded-full px-5 py-2 text-sm font-mono transition-all ${
                  currency === option
                    ? 'bg-neon-500 text-jungle-900 font-bold'
                    : 'text-warm-400 hover:text-warm'
                }`}
              >
                {option === 'PHP' ? '₱ Philippine Pesos' : '$ USD fallback'}
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 max-w-5xl mx-auto mb-12">
          {PRICING_TIERS.map((tier, i) => (
            <PricingCard
              key={tier.id}
              tier={tier}
              index={i}
              currency={currency}
              onRequestCheckout={onSelectPlan}
            />
          ))}
        </div>

        {/* Checkout */}
        <div className="max-w-5xl mx-auto">
          <AuthGateCheckout selectedPlanId={selectedPlanId} currency={currency} />
        </div>
      </div>
    </section>
  );
}

// ── Final Contact Note ────────────────────────────────────────────

function FinalCTA() {
  return (
    <section id="final-cta" className="py-14 lg:py-16 bg-jungle-900/20">
      <div className="container-base">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-warm-400 text-sm sm:text-base leading-relaxed">
            Still unsure? Email{' '}
            <a
              href="mailto:hello@clawph.com"
              className="text-warm hover:text-neon-500 transition-colors underline underline-offset-4"
            >
              hello@clawph.com
            </a>
            {' '}and we&apos;ll point you to the right next step.
          </p>
        </div>
      </div>
    </section>
  );
}

// ── Main Page ─────────────────────────────────────────────────────

export default function PricingPage() {
  const heroRef = useRef(null);
  const [selectedPlanId, setSelectedPlanId] = useState<PricingPlanId>('openclaw-growth');

  const heroInView = useInView(heroRef, { once: true, margin: '-100px' });

  return (
    <div className="min-h-screen bg-jungle">
      {/* ── Sticky header ── */}
      <LandingHeader />

      {/* ── SECTION 1: Hero ── */}
      <section
        ref={heroRef}
        id="hero"
        className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden"
      >
        {/* Background radial glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-neon-500/10 rounded-full blur-[200px]" />
        </div>

        <div className="container-base relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-500/10 border border-neon-500/20 mb-6">
              <Sparkles size={14} className="text-neon-500" />
              <span className="text-neon-500 text-sm font-mono">
                OpenClaw in the Philippines — no server required
              </span>
            </div>

            {/* H1 — answers: who it's for / what it does / why it matters */}
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black text-warm tracking-tight leading-[0.95] mb-6">
              <span className="block">Your own 24/7 AI assistant,</span>
              <span className="block text-gradient mt-2">deployed for Philippine businesses</span>
            </h1>

            {/* Subheadline */}
            <p className="text-warm-400 text-lg max-w-xl mx-auto mb-8 leading-relaxed">
              ClawPH sets up your OpenClaw AI assistant on Telegram, Discord, or WhatsApp — configured for how Filipino businesses work. Runs while you sleep. Scales without hiring.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
              <button
                type="button"
                onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                className="btn btn-primary px-8 w-full sm:w-auto justify-center"
              >
                View Pricing
              </button>
              <button
                type="button"
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                className="btn btn-ghost px-8 w-full sm:w-auto justify-center border border-warm/20"
              >
                How it works
              </button>
            </div>

            {/* Trust strip */}
            <TrustStrip variant="hero" />
          </motion.div>
        </div>
      </section>

      {/* ── SECTION 2: How it works ── */}
      <HowItWorksSection />

      {/* ── SECTION 3: Use cases ── */}
      <UseCasesSection />

      {/* ── SECTION 4: Why ClawPH ── */}
      <WhyClawPHSection />

      {/* ── SECTION 5: Pricing ── */}
      <PricingSection
        selectedPlanId={selectedPlanId}
        onSelectPlan={setSelectedPlanId}
      />

      {/* ── SECTION 6: Guarantee ── */}
      <GuaranteeSection />

      {/* ── SECTION 7: FAQ ── */}
      <FAQSection />

      {/* ── SECTION 8: Final CTA ── */}
      <FinalCTA />
    </div>
  );
}
