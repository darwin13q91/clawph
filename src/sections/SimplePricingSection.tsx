import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Check, Zap, TrendingUp, Globe, Sparkles, ArrowRight } from 'lucide-react';
import CalendlyButton from '../components/CalendlyButton';

interface Package {
  id: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  name: string;
  tagline: string;
  price: string;
  priceSubtext?: string;
  originalPrice?: string;
  badge: string;
  description: string;
  features: string[];
  maintenance?: {
    price: string;
    includes: string[];
  };
  bestFor: string;
  cta: string;
  color: 'neon' | 'amazon' | 'violet';
  popular?: boolean;
}

const packages: Package[] = [
  {
    id: 'ai',
    icon: Zap,
    name: 'River AI Intelligence',
    tagline: 'AI-powered Amazon intelligence 24/7',
    price: '$499',
    originalPrice: '$997',
    badge: '50% Off Founding',
    description: 'Custom River AI agent that analyzes 10,000+ data points and delivers actionable insights via Telegram.',
    features: [
      'River AI agent with 23 specialized modes',
      'Telegram control — text it like an assistant',
      '5 intelligent workflows configured',
      'Runs on your infrastructure',
      '48-hour white-glove setup',
      '30-day satisfaction guarantee',
      'Compliance-first recommendations',
    ],
    maintenance: {
      price: '$97/mo',
      includes: [
        'Bug fixes & troubleshooting',
        'Monthly health check call',
        'Email support (<1hr response)',
        'Minor tweaks & adjustments',
      ],
    },
    bestFor: 'Sellers spending 10+ hrs/week on repetitive tasks',
    cta: 'Book River AI Setup Call',
    color: 'neon',
  },
  {
    id: 'amazon',
    icon: TrendingUp,
    name: 'River Amazon Growth',
    tagline: 'Strategic guidance for scaling',
    price: 'Custom',
    priceSubtext: 'based on size',
    badge: 'Most Popular',
    description: 'River-powered strategic guidance for listings, PPC, inventory, and growth acceleration.',
    features: [
      'Listing optimization recommendations',
      'PPC strategy & campaign guidance',
      'Weekly performance reports',
      'Inventory & pricing monitoring',
      'Monthly strategy calls',
      '30-day cancellation anytime',
      'Priority support',
    ],
    bestFor: 'Sellers doing $10K+/mo wanting to scale',
    cta: 'Book Growth Strategy Call',
    color: 'amazon',
    popular: true,
  },
  {
    id: 'website',
    icon: Globe,
    name: 'Brand Website',
    tagline: 'Your own storefront outside Amazon',
    price: '$599',
    originalPrice: '$1,497',
    badge: 'Launch Your Brand',
    description: 'Custom website to build your brand, capture emails, and drive external traffic to Amazon.',
    features: [
      'Custom brand website (5-7 pages)',
      'Mobile-responsive design',
      'Email capture & newsletter setup',
      'Blog for content marketing',
      'Social media integration',
      'SEO optimized for Google',
      '1-week delivery guarantee',
    ],
    maintenance: {
      price: '$49/mo',
      includes: [
        'Hosting & SSL included',
        'Security updates',
        'Monthly backups',
        'Content updates (2/mo)',
      ],
    },
    bestFor: 'Sellers ready to build a brand beyond Amazon',
    cta: 'Book Website Discovery Call',
    color: 'violet',
  },
];

const colorClasses = {
  neon: {
    text: 'text-neon-500',
    bg: 'bg-neon-500/20',
    border: 'border-neon-500/30',
    badge: 'bg-neon-500 text-jungle-900',
    glow: 'shadow-[0_0_30px_rgba(207,255,0,0.15)]',
    gradient: 'from-neon-500/10 to-transparent',
  },
  amazon: {
    text: 'text-amazon-orange',
    bg: 'bg-amazon-orange/20',
    border: 'border-amazon-orange/30',
    badge: 'bg-amazon-orange text-amazon-dark',
    glow: 'shadow-[0_0_30px_rgba(255,153,0,0.15)]',
    gradient: 'from-amazon-orange/10 to-transparent',
  },
  violet: {
    text: 'text-violet-400',
    bg: 'bg-violet-500/20',
    border: 'border-violet-500/30',
    badge: 'bg-violet-500 text-warm-100',
    glow: 'shadow-[0_0_30px_rgba(110,46,140,0.15)]',
    gradient: 'from-violet-500/10 to-transparent',
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

export default function SimplePricingSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section
      ref={sectionRef}
      id="pricing"
      className="relative z-10 bg-jungle-800/80 backdrop-blur-sm section-xl overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url('/images/violet_flower_bg.jpg')`,
            backgroundSize: 'cover',
          }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-neon-500/5 rounded-full blur-[150px]" />
      </div>

      <div className="container-base relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16 sm:mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-500/10 border border-neon-500/20 mb-6">
            <Sparkles size={14} className="text-neon-500" aria-hidden="true" />
            <span className="text-neon text-sm font-mono font-medium">Simple Pricing — No Hidden Fees</span>
          </div>

          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-warm uppercase tracking-tight leading-[1.1] mb-5">
            Choose Your Path
          </h2>

          <p className="text-warm-400 text-base sm:text-lg max-w-2xl mx-auto">
            Three ways to grow. Pick what fits your biggest pain point right now.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch"
        >
          {packages.map((pkg) => {
            const colors = colorClasses[pkg.color];

            return (
              <motion.div
                key={pkg.id}
                variants={cardVariants}
                whileHover={{ y: -8 }}
                transition={{ duration: 0.3 }}
                className={`relative flex flex-col rounded-3xl ${
                  pkg.popular
                    ? `ring-2 ring-neon-500 ${colors.glow}`
                    : 'border border-warm/10'
                }`}
              >
                {/* Badge - positioned outside the overflow-hidden container */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30">
                  <span
                    className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg ${colors.badge}`}
                  >
                    {pkg.popular && <Sparkles size={12} aria-hidden="true" />}
                    {pkg.badge}
                  </span>
                </div>

                {/* Card Inner Container with overflow-hidden for content */}
                <div className="relative rounded-3xl overflow-hidden flex flex-col h-full bg-jungle-800/50">
                  {/* Gradient Background */}
                  <div className={`absolute inset-0 bg-gradient-to-b ${colors.gradient} opacity-50`} />

                  {/* Card Content */}
                  <div className="relative card pt-14 pb-6 px-6 sm:pt-16 sm:pb-8 sm:px-8 flex flex-col h-full">
                  {/* Header */}
                  <div className="flex items-start gap-3 sm:gap-4 mb-5">
                    <div
                      className={`w-12 h-12 rounded-xl sm:rounded-2xl ${colors.bg} flex items-center justify-center flex-shrink-0`}
                    >
                      <pkg.icon className={colors.text} size={24} aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display text-lg sm:text-xl lg:text-2xl font-bold text-warm uppercase leading-tight">
                        {pkg.name}
                      </h3>
                      <p className={`text-xs sm:text-sm ${colors.text} mt-0.5`}>{pkg.tagline}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-5">
                    <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
                      <span className={`font-mono text-3xl sm:text-4xl lg:text-5xl font-bold ${colors.text}`}>
                        {pkg.price}
                      </span>
                      {pkg.priceSubtext && (
                        <span className="text-warm-400 text-sm">{pkg.priceSubtext}</span>
                      )}
                      {pkg.originalPrice && (
                        <span className="text-warm-400 line-through text-sm">{pkg.originalPrice}</span>
                      )}
                    </div>
                    <p className="text-warm-400 text-xs sm:text-sm mt-2">{pkg.description}</p>
                  </div>

                  {/* Features */}
                  <ul className="space-y-2.5 sm:space-y-3 mb-5 flex-grow">
                    {pkg.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 sm:gap-3">
                        <div
                          className={`w-5 h-5 rounded-full ${colors.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}
                        >
                          <Check className={colors.text} size={12} strokeWidth={3} aria-hidden="true" />
                        </div>
                        <span className="text-warm-400 text-xs sm:text-sm leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Maintenance (if applicable) */}
                  {pkg.maintenance && (
                    <div className="mb-5 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-warm/5 border border-warm/10">
                      <p className="text-warm-400 text-xs uppercase tracking-wide mb-2">Optional Maintenance</p>
                      <div className="flex items-baseline gap-2 mb-2 sm:mb-3">
                        <span className={`font-mono text-lg sm:text-xl font-bold ${colors.text}`}>
                          {pkg.maintenance.price}
                        </span>
                        <span className="text-warm-400 text-xs">cancel anytime</span>
                      </div>
                      <ul className="space-y-1">
                        {pkg.maintenance.includes.map((item) => (
                          <li key={item} className="flex items-center gap-2 text-warm-400 text-xs">
                            <Check className={colors.text} size={10} aria-hidden="true" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Best For */}
                  <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-warm/5 mb-5">
                    <p className="text-warm-400 text-xs uppercase tracking-wide mb-1">Best For</p>
                    <p className="text-warm text-xs sm:text-sm">{pkg.bestFor}</p>
                  </div>

                  {/* CTA */}
                  <CalendlyButton
                    className="w-full justify-center text-sm sm:text-base gap-2"
                    variant={pkg.popular ? 'primary' : 'secondary'}
                  >
                    {pkg.cta}
                    <ArrowRight size={16} aria-hidden="true" />
                  </CalendlyButton>
                </div>
              </div>
            </motion.div>
            );
          })}
        </motion.div>

        {/* Bottom Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 sm:mt-16 text-center"
        >
          <div className="inline-flex flex-col sm:flex-row items-center gap-3 sm:gap-4 p-4 sm:p-6 rounded-2xl bg-warm/5 border border-warm/10">
            <p className="text-warm-400 text-sm sm:text-base">Not sure which is right for you?</p>
            <CalendlyButton variant="ghost" className="whitespace-nowrap text-sm">
              <span className="flex items-center gap-2">
                Book Free Consultation
                <ArrowRight size={16} aria-hidden="true" />
              </span>
            </CalendlyButton>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
