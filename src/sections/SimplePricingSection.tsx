import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Check, Zap, TrendingUp, Globe, Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import CalendlyButton from '../components/CalendlyButton';

gsap.registerPlugin(ScrollTrigger);

const packages = [
  {
    id: 'ai',
    icon: Zap,
    name: 'River AI Intelligence',
    tagline: 'AI-powered Amazon intelligence 24/7',
    price: '$997',
    originalPrice: '$1,997',
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
    price: '$999/mo',
    originalPrice: '$1,999/mo',
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
    price: '$1,497',
    originalPrice: '$2,997',
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
    text: 'text-neon',
    bg: 'bg-neon/20',
    border: 'border-neon/30',
    badge: 'bg-neon text-jungle',
    glow: 'shadow-neon',
  },
  amazon: {
    text: 'text-amazon',
    bg: 'bg-amazon/20',
    border: 'border-amazon/30',
    badge: 'bg-amazon text-amazon-dark',
    glow: 'shadow-[0_0_30px_rgba(255,153,0,0.3)]',
  },
  violet: {
    text: 'text-violet-light',
    bg: 'bg-violet/20',
    border: 'border-violet/30',
    badge: 'bg-violet text-warm',
    glow: 'shadow-[0_0_30px_rgba(110,46,140,0.3)]',
  },
};

export default function SimplePricingSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        headerRef.current,
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: headerRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        }
      );

      cardsRef.current.forEach((card, index) => {
        if (card) {
          gsap.fromTo(
            card,
            { y: 60, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.7,
              delay: index * 0.15,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: card,
                start: 'top 85%',
                toggleActions: 'play none none none',
              },
            }
          );
        }
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="pricing"
      className="relative z-60 bg-jungle py-24 lg:py-32 overflow-hidden"
    >
      {/* Background */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url('/images/violet_flower_bg.jpg')`,
          backgroundSize: 'cover',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        {/* Header */}
        <div ref={headerRef} className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon/10 text-neon text-sm font-mono mb-6">
            <Sparkles size={14} />
            Simple Pricing — No Hidden Fees
          </span>
          
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black text-warm uppercase tracking-tight mb-6">
            Choose Your Path
          </h2>
          
          <p className="text-warm-72 text-lg sm:text-xl max-w-2xl mx-auto">
            Three ways to grow. Pick what fits your biggest pain point right now.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {packages.map((pkg, index) => {
            const colors = colorClasses[pkg.color as keyof typeof colorClasses];
            
            return (
              <motion.div
                key={pkg.id}
                ref={(el) => { cardsRef.current[index] = el; }}
                whileHover={{ y: -8 }}
                transition={{ duration: 0.3 }}
                className={`relative flex flex-col rounded-3xl overflow-hidden ${
                  pkg.popular 
                    ? `ring-2 ring-neon ${colors.glow}` 
                    : 'border border-warm/10'
                }`}
              >
                {/* Badge */}
                <div className="absolute -top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                  <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${colors.badge}`}>
                    {pkg.popular && <Sparkles size={12} />}
                    {pkg.badge}
                  </span>
                </div>

                {/* Card Content */}
                <div className="card-jungle p-6 lg:p-8 flex flex-col h-full">
                  {/* Header */}
                  <div className="flex items-start gap-4 mb-6">
                    <div className={`w-12 h-12 rounded-2xl ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                      <pkg.icon className={colors.text} size={24} />
                    </div>
                    <div>
                      <h3 className="font-display text-xl lg:text-2xl font-bold text-warm uppercase">
                        {pkg.name}
                      </h3>
                      <p className={`text-sm ${colors.text}`}>{pkg.tagline}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-3">
                      <span className={`font-mono text-4xl lg:text-5xl font-bold ${colors.text}`}>
                        {pkg.price}
                      </span>
                      <span className="text-warm/40 line-through text-sm">
                        {pkg.originalPrice}
                      </span>
                    </div>
                    <p className="text-warm-72 text-sm mt-2">{pkg.description}</p>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-6 flex-grow">
                    {pkg.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full ${colors.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <Check className={colors.text} size={12} strokeWidth={3} />
                        </div>
                        <span className="text-warm-72 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Maintenance (if applicable) */}
                  {pkg.maintenance && (
                    <div className="mb-6 p-4 rounded-2xl bg-warm/5 border border-warm/10">
                      <p className="text-warm-50 text-xs uppercase tracking-wide mb-2">
                        Optional Maintenance
                      </p>
                      <div className="flex items-baseline gap-2 mb-3">
                        <span className={`font-mono text-xl font-bold ${colors.text}`}>{pkg.maintenance.price}</span>
                        <span className="text-warm/50 text-xs">cancel anytime</span>
                      </div>
                      <ul className="space-y-1">
                        {pkg.maintenance.includes.map((item) => (
                          <li key={item} className="flex items-center gap-2 text-warm/70 text-xs">
                            <Check className={colors.text} size={10} />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Best For */}
                  <div className="p-4 rounded-2xl bg-warm/5 mb-6">
                    <p className="text-warm-50 text-xs uppercase tracking-wide mb-1">Best For</p>
                    <p className="text-warm text-sm">{pkg.bestFor}</p>
                  </div>

                  {/* CTA */}
                  <CalendlyButton 
                    className="w-full justify-center"
                    variant={pkg.popular ? 'primary' : 'secondary'}
                  >
                    {pkg.cta}
                  </CalendlyButton>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom Note */}
        <div className="mt-16 text-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-6 rounded-2xl bg-warm/5 border border-warm/10">
            <p className="text-warm-72">
              Not sure which is right for you?
            </p>
            <CalendlyButton variant="ghost" className="whitespace-nowrap">
              <span className="flex items-center gap-2">
                Book Free Consultation
                <ArrowRight size={16} />
              </span>
            </CalendlyButton>
          </div>
        </div>
      </div>
    </section>
  );
}