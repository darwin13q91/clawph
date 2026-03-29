import { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Sparkles,
  TrendingUp,
  Zap,
  Check,
  X,
  Shield,
  ChevronDown,
  Star,
} from 'lucide-react';
import CalendlyButton from '../components/CalendlyButton';

// ── Types ───────────────────────────────────────────────────

type BadgeStyle = 'popular' | 'value';

interface PricingTier {
  id: 'amazon-growth' | 'ai-automation';
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

interface ComparisonRow {
  feature: string;
  amazonGrowth: boolean | string;
  aiAutomation: boolean | string;
}

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  revenue: string;
  initials: string;
  avatarBg: 'neon' | 'violet';
}

interface FAQItem {
  question: string;
  answer: string;
}

// ── Static Data ──────────────────────────────────────────────

const PRICING_TIERS: PricingTier[] = [
  {
    id: 'amazon-growth',
    variant: 'primary',
    icon: TrendingUp,
    name: 'RIVER AMAZON GROWTH',
    tagline: 'Strategic guidance for scaling',
    price: '$999',
    priceSubtext: '/mo',
    badge: 'MOST POPULAR',
    badgeStyle: 'popular',
    features: [
      'Listing optimization recommendations',
      'PPC strategy & campaign guidance',
      'Weekly performance reports',
      'Inventory & pricing monitoring',
      'Monthly 1:1 strategy call',
      'Priority Telegram support',
      '30-day cancellation anytime',
    ],
    ctaLabel: 'Book Growth Strategy Call',
    highlightColor: 'neon',
  },
  {
    id: 'ai-automation',
    variant: 'secondary',
    icon: Zap,
    name: 'RIVER AI AUTOMATION',
    tagline: 'AI-powered intelligence 24/7',
    price: '$997',
    priceSubtext: ' one-time',
    badge: 'BEST VALUE',
    badgeStyle: 'value',
    features: [
      'River AI agent (23 modes)',
      'Telegram control interface',
      '5 custom workflows configured',
      '48-hour white-glove setup',
      'Works on your infrastructure',
      'Compliance-first recommendations',
      '30-day money-back guarantee',
    ],
    ctaLabel: 'Book AI Setup Call',
    highlightColor: 'violet',
  },
];

const COMPARISON_ROWS: ComparisonRow[] = [
  { feature: 'Listing optimization', amazonGrowth: true, aiAutomation: false },
  { feature: 'PPC campaign guidance', amazonGrowth: true, aiAutomation: false },
  { feature: 'Weekly performance reports', amazonGrowth: true, aiAutomation: false },
  { feature: 'Monthly strategy call', amazonGrowth: true, aiAutomation: false },
  { feature: 'Priority support', amazonGrowth: true, aiAutomation: false },
  { feature: 'Cancel anytime', amazonGrowth: '30 days notice', aiAutomation: false },
  { feature: 'AI agent (23 modes)', amazonGrowth: false, aiAutomation: true },
  { feature: 'Telegram AI interface', amazonGrowth: false, aiAutomation: true },
  { feature: '5 custom workflows', amazonGrowth: false, aiAutomation: true },
  { feature: 'Infrastructure ownership', amazonGrowth: false, aiAutomation: true },
  { feature: '30-day guarantee', amazonGrowth: true, aiAutomation: true },
];

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Within 2 weeks of the Amazon Growth plan, our PPC ACOS dropped 18% and we had a clear roadmap for Q2. This is what good consulting looks like.",
    author: 'Marcus T.',
    role: 'Private Label Seller',
    revenue: '$45K/mo revenue',
    initials: 'MT',
    avatarBg: 'neon',
  },
  {
    quote:
      "The AI agent literally messaged me at 2am about a pricing opportunity I'd have missed. That's the kind of coverage I needed.",
    author: 'Sarah K.',
    role: 'Aggregator Account Manager',
    revenue: 'manages $800K/mo',
    initials: 'SK',
    avatarBg: 'violet',
  },
  {
    quote:
      "I was skeptical about the one-time price. 6 months later I've saved 200+ hours and the system still works without me.",
    author: 'James R.',
    role: 'Multi-marketplace Seller',
    revenue: 'US + UK + EU',
    initials: 'JR',
    avatarBg: 'neon',
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "What's the difference between Amazon Growth and AI Automation?",
    answer:
      "Amazon Growth is strategy + hands-on management. AI Automation is a tool you own and operate. Most clients use both.",
  },
  {
    question: "What if I'm doing less than $10K/month?",
    answer:
      "AI Automation starts at $997 and is designed for sellers at any stage. Amazon Growth works best for sellers at $10K+/mo who need strategic guidance.",
  },
  {
    question: 'How does the 30-day guarantee work?',
    answer:
      "If your AI agent doesn't save you 5+ hours in the first 30 days, we refund 100% of your setup fee. You keep everything we built.",
  },
  {
    question: 'Can I cancel Amazon Growth anytime?',
    answer: 'Yes. 30-day notice, no penalties, no hoops. We\'re confident enough to not lock you in.',
  },
  {
    question: 'What happens after I book?',
    answer:
      "You'll get a Calendly confirmation + a prep email. We'll assess your current setup before the call so every minute is valuable.",
  },
];

// ── Animation Variants ─────────────────────────────────────

const fadeUpVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

// ── Sub-components ─────────────────────────────────────────

function PricingCard({
  tier,
  index,
}: {
  tier: PricingTier;
  index: number;
}) {
  const isPrimary = tier.variant === 'primary';
  const Icon = tier.icon;

  const badgeBg = isPrimary
    ? 'bg-neon-500/10 border border-neon-500/30'
    : 'bg-violet-500/10 border border-violet-500/30';
  const badgeText = isPrimary ? 'text-neon-500' : 'text-violet-400';

  const cardClasses = isPrimary
    ? 'relative rounded-3xl ring-2 ring-neon-500 bg-gradient-to-b from-neon-500/5 to-transparent border border-neon-500/30 p-8 lg:p-10'
    : 'relative rounded-3xl bg-warm/5 border border-warm/10 hover:border-warm/20 transition-colors p-8 lg:p-10';

  const priceColor = isPrimary ? 'text-neon-500' : 'text-warm';
  const glowShadow = isPrimary
    ? 'shadow-[0_0_40px_rgba(207,255,0,0.15)]'
    : 'shadow-none';

  return (
    <motion.div
      variants={fadeUpVariants}
      custom={0.3 + index * 0.15}
      whileHover={{ y: -8 }}
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
          {!isPrimary && (
            <span className="text-violet-400 text-sm">⚡</span>
          )}
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
      <h3 className="font-display text-2xl font-black text-warm uppercase tracking-tight mb-1">
        {tier.name}
      </h3>
      <p className={`text-sm font-mono mb-6 ${isPrimary ? 'text-neon-500' : 'text-violet-400'}`}>
        {tier.tagline}
      </p>

      {/* Price */}
      <div className="mb-8">
        <span className={`font-mono text-5xl font-bold ${priceColor}`}>
          {tier.price}
        </span>
        <span className="text-warm-400 text-sm ml-1">{tier.priceSubtext}</span>
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-8">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <Check
              size={16}
              className={isPrimary ? 'text-neon-500 flex-shrink-0 mt-0.5' : 'text-violet-400 flex-shrink-0 mt-0.5'}
            />
            <span className="text-warm-400 text-sm leading-relaxed">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <CalendlyButton
        variant={isPrimary ? 'primary' : 'secondary'}
        size="lg"
        className="w-full justify-center"
      >
        {tier.ctaLabel}
      </CalendlyButton>
    </motion.div>
  );
}

function ComparisonTable() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={containerVariants}
      className="overflow-x-auto"
    >
      {/* Desktop Table */}
      <div className="hidden md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-warm/10">
              <th className="text-left py-4 px-4 font-display text-sm uppercase tracking-wider text-warm-400 font-semibold">
                Feature
              </th>
              <th className="text-center py-4 px-4 font-display text-sm uppercase tracking-wider text-neon-500 font-semibold min-w-[180px]">
                Amazon Growth
                <span className="block text-xs font-mono text-warm-400 normal-case font-normal mt-0.5">
                  $999/mo
                </span>
              </th>
              <th className="text-center py-4 px-4 font-display text-sm uppercase tracking-wider text-violet-400 font-semibold min-w-[180px]">
                AI Automation
                <span className="block text-xs font-mono text-warm-400 normal-case font-normal mt-0.5">
                  $997 one-time
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON_ROWS.map((row, i) => (
              <motion.tr
                key={row.feature}
                variants={fadeUpVariants}
                custom={i * 0.05}
                className="border-b border-warm/5 hover:bg-warm/5 transition-colors"
              >
                <td className="py-4 px-4 text-warm-400 text-sm">{row.feature}</td>
                <td className="text-center py-4 px-4">
                  {typeof row.amazonGrowth === 'boolean' ? (
                    row.amazonGrowth ? (
                      <Check size={18} className="inline text-neon-500" />
                    ) : (
                      <X size={18} className="inline text-warm/30" />
                    )
                  ) : (
                    <span className="text-xs font-mono text-warm-400">{row.amazonGrowth}</span>
                  )}
                </td>
                <td className="text-center py-4 px-4">
                  {typeof row.aiAutomation === 'boolean' ? (
                    row.aiAutomation ? (
                      <Check size={18} className="inline text-violet-400" />
                    ) : (
                      <X size={18} className="inline text-warm/30" />
                    )
                  ) : (
                    <span className="text-xs font-mono text-warm-400">{row.aiAutomation}</span>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: Stacked cards */}
      <div className="md:hidden space-y-4">
        {COMPARISON_ROWS.map((row, i) => (
          <motion.div
            key={row.feature}
            variants={fadeUpVariants}
            custom={i * 0.05}
            className="p-4 rounded-xl bg-warm/5 border border-warm/10"
          >
            <p className="text-warm-400 text-sm font-medium mb-3">{row.feature}</p>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-xs font-mono text-warm-400 mb-1">Amazon Growth</p>
                <div className="flex justify-center">
                  {typeof row.amazonGrowth === 'boolean' ? (
                    row.amazonGrowth ? (
                      <Check size={18} className="text-neon-500" />
                    ) : (
                      <X size={18} className="text-warm/30" />
                    )
                  ) : (
                    <span className="text-xs font-mono text-warm-400">{row.amazonGrowth}</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-mono text-warm-400 mb-1">AI Automation</p>
                <div className="flex justify-center">
                  {typeof row.aiAutomation === 'boolean' ? (
                    row.aiAutomation ? (
                      <Check size={18} className="text-violet-400" />
                    ) : (
                      <X size={18} className="text-warm/30" />
                    )
                  ) : (
                    <span className="text-xs font-mono text-warm-400">{row.aiAutomation}</span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function TestimonialCard({ t, index }: { t: Testimonial; index: number }) {
  const isNeon = t.avatarBg === 'neon';
  return (
    <motion.div
      variants={fadeUpVariants}
      custom={0.2 + index * 0.15}
      whileHover={{ y: -4 }}
      className="p-6 rounded-2xl bg-warm/5 border border-warm/10 hover:border-warm/20 transition-colors"
    >
      {/* Quote icon */}
      <div className="text-neon-500 text-4xl font-display leading-none mb-4">"</div>

      {/* Stars */}
      <div className="flex gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={14} className="text-neon-500 fill-neon-500" />
        ))}
      </div>

      <p className="text-warm leading-relaxed mb-6 text-sm">{t.quote}</p>

      {/* Author */}
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
            isNeon ? 'bg-neon-500/20 text-neon-500' : 'bg-violet-500/20 text-violet-400'
          }`}
        >
          {t.initials}
        </div>
        <div>
          <p className="text-warm font-semibold text-sm">{t.author}</p>
          <p className="text-warm-400 text-xs">
            {t.role} · {t.revenue}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div
            key={i}
            className="rounded-xl border border-warm/10 overflow-hidden bg-warm/5"
          >
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="w-full flex items-center justify-between p-5 text-left gap-4 hover:bg-warm/5 transition-colors"
              aria-expanded={isOpen}
            >
              <span className="text-warm font-medium text-sm pr-2">{item.question}</span>
              <ChevronDown
                size={18}
                className={`text-warm-400 flex-shrink-0 transition-transform duration-300 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isOpen ? 'max-h-96' : 'max-h-0'
              }`}
            >
              <p className="px-5 pb-5 text-warm-400 text-sm leading-relaxed">
                {item.answer}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page Component ──────────────────────────────────────

export default function PricingPage() {
  const heroRef = useRef(null);
  const cardsRef = useRef(null);
  const comparisonRef = useRef(null);
  const testimonialsRef = useRef(null);
  const guaranteeRef = useRef(null);
  const faqRef = useRef(null);
  const finalCtaRef = useRef(null);

  const heroInView = useInView(heroRef, { once: true, margin: '-100px' });
  const cardsInView = useInView(cardsRef, { once: true, margin: '-100px' });
  const comparisonInView = useInView(comparisonRef, { once: true, margin: '-100px' });
  const testimonialsInView = useInView(testimonialsRef, { once: true, margin: '-100px' });
  const guaranteeInView = useInView(guaranteeRef, { once: true, margin: '-100px' });
  const faqInView = useInView(faqRef, { once: true, margin: '-100px' });
  const finalCtaInView = useInView(finalCtaRef, { once: true, margin: '-100px' });

  return (
    <div className="min-h-screen bg-jungle">
      {/* ── SECTION 1: Hero ── */}
      <section
        ref={heroRef}
        id="pricing-hero"
        className="relative section-xl overflow-hidden pt-32"
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
                Simple Pricing — No Retainers, No Surprises
              </span>
            </div>

            {/* H1 */}
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black text-warm uppercase tracking-tight leading-[0.95] mb-6">
              <span className="block">Pick Your Path to</span>
              <span className="block text-gradient mt-2">More Sales, Less Grind</span>
            </h1>

            {/* Subheadline */}
            <p className="text-warm-400 text-lg max-w-xl mx-auto mb-8 leading-relaxed">
              Stop drowning in Amazon busywork. We built the systems that run without you — and
              the strategy to grow your business.
            </p>

            {/* Micro social proof */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-warm-400 text-sm font-mono">
              <span className="flex items-center gap-1.5">
                <Check size={14} className="text-neon-500" />
                50+ Amazon sellers onboarded
              </span>
              <span className="flex items-center gap-1.5">
                <Check size={14} className="text-neon-500" />
                $2M+ monthly revenue managed
              </span>
              <span className="flex items-center gap-1.5">
                <Check size={14} className="text-neon-500" />
                30-day guarantee
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── SECTION 2: Pricing Cards ── */}
      <section ref={cardsRef} id="pricing-cards" className="section-xl">
        <div className="container-base">
          <motion.div
            initial="hidden"
            animate={cardsInView ? 'visible' : 'hidden'}
            variants={containerVariants}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 max-w-5xl mx-auto"
          >
            {PRICING_TIERS.map((tier, i) => (
              <PricingCard key={tier.id} tier={tier} index={i} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── SECTION 3: Comparison Table ── */}
      <section ref={comparisonRef} id="comparison" className="section-xl">
        <div className="container-base">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={comparisonInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-3xl lg:text-4xl font-black text-warm uppercase tracking-tight">
              Compare Plans
            </h2>
          </motion.div>
          <div className="max-w-4xl mx-auto">
            <ComparisonTable />
          </div>
        </div>
      </section>

      {/* ── SECTION 4: Testimonials ── */}
      <section ref={testimonialsRef} id="testimonials" className="section-xl bg-jungle-900/30">
        <div className="container-base">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={testimonialsInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-3xl lg:text-4xl font-black text-warm uppercase tracking-tight">
              What Clients Say
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            animate={testimonialsInView ? 'visible' : 'hidden'}
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto"
          >
            {TESTIMONIALS.map((t, i) => (
              <TestimonialCard key={t.author} t={t} index={i} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── SECTION 5: Guarantee ── */}
      <section ref={guaranteeRef} id="guarantee" className="section-xl">
        <div className="container-base">
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={guaranteeInView ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ duration: 0.6 }}
            className="max-w-2xl mx-auto"
          >
            <div className="relative p-8 lg:p-12 rounded-[2rem] bg-gradient-to-br from-neon-500/10 to-transparent border border-neon-500/30 overflow-hidden text-center">
              {/* Decorative glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-neon-500/10 rounded-full blur-[80px] pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/20 rounded-full blur-[60px] pointer-events-none" />

              <div className="relative z-10">
                {/* Shield icon */}
                <div className="w-16 h-16 rounded-full bg-neon-500/20 flex items-center justify-center mx-auto mb-6">
                  <Shield className="text-neon-500" size={32} />
                </div>

                <h2 className="font-display text-3xl lg:text-4xl font-black text-warm uppercase tracking-tight mb-2">
                  30-Day Money-Back
                </h2>
                <h2 className="font-display text-3xl lg:text-4xl font-black text-warm uppercase tracking-tight mb-6">
                  Guarantee
                </h2>
                <p className="text-neon-500 font-mono text-sm font-bold tracking-widest mb-8">
                  NO QUESTIONS ASKED
                </p>

                {/* Bullets */}
                <div className="space-y-3 mb-8 text-left max-w-sm mx-auto">
                  {[
                    'AI agent must save you 5+ hours/week or full refund',
                    'You keep the workflows even if you cancel',
                    'Free 1-hour exit call to diagnose what went wrong',
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <Check size={16} className="text-neon-500 flex-shrink-0 mt-0.5" />
                      <span className="text-warm-400 text-sm">{item}</span>
                    </div>
                  ))}
                </div>

                <p className="text-warm/60 text-sm italic">
                  "We spent a decade in Amazon's trenches. We're confident we can help — or you
                  don't pay."
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── SECTION 6: FAQ ── */}
      <section ref={faqRef} id="faq" className="section-xl bg-jungle-900/30">
        <div className="container-base">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={faqInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-3xl lg:text-4xl font-black text-warm uppercase tracking-tight">
              Common Questions
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={faqInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="max-w-2xl mx-auto"
          >
            <FAQAccordion items={FAQ_ITEMS} />
          </motion.div>
        </div>
      </section>

      {/* ── SECTION 7: Final CTA ── */}
      <section ref={finalCtaRef} id="final-cta" className="section-xl">
        <div className="container-base">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={finalCtaInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto"
          >
            <div className="relative p-10 lg:p-16 rounded-[2rem] bg-jungle-800/80 backdrop-blur border border-warm/10 text-center overflow-hidden">
              {/* Background glow */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-neon-500/10 rounded-full blur-[150px]" />
              </div>

              <div className="relative z-10">
                <h2 className="font-display text-2xl lg:text-4xl font-black text-warm uppercase tracking-tight mb-4">
                  Ready to Stop Drowning
                  <br />
                  <span className="text-gradient">in Amazon Work?</span>
                </h2>

                <p className="text-warm-400 text-lg max-w-md mx-auto mb-8 leading-relaxed">
                  Free 30-minute strategy call. We'll tell you exactly which plan fits — even if
                  it's neither.
                </p>

                <div className="flex flex-col items-center gap-4">
                  <CalendlyButton variant="primary" size="lg">
                    Book Free Strategy Call
                  </CalendlyButton>

                  <a
                    href="mailto:hello@amajungle.com"
                    className="text-warm-400 hover:text-neon-500 text-sm transition-colors"
                  >
                    or email us at hello@amajungle.com
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
