import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Check, Zap, TrendingUp, Globe, Info } from 'lucide-react';
import CalendlyButton from '../components/CalendlyButton';

gsap.registerPlugin(ScrollTrigger);

const packages = [
  {
    id: 'ai',
    icon: Zap,
    name: 'AI Automation',
    tagline: 'Let AI run your business 24/7',
    price: '$997',
    originalPrice: '$1,997',
    badge: '50% Off Founding Price',
    description: 'Custom AI agent that handles repetitive tasks. One-time setup — you own it forever.',
    features: [
      'Custom AI agent built for YOUR workflow',
      'Telegram control — text it like an assistant',
      '5 automations configured (email, reports, alerts)',
      'Runs on your hardware — you own everything',
      '48-hour white-glove setup',
      '30-day satisfaction guarantee',
    ],
    maintenance: {
      price: '$97/mo',
      description: 'Optional maintenance plan',
      includes: [
        'Bug fixes & troubleshooting',
        'Monthly health check (15-min call)',
        'Email support (24-48hr response)',
        'Minor tweaks & adjustments',
        'Dependency updates',
      ],
    },
    bestFor: 'Sellers spending 10+ hrs/week on repetitive tasks',
    cta: 'Book AI Setup Call',
  },
  {
    id: 'amazon',
    icon: TrendingUp,
    name: 'Amazon Growth',
    tagline: 'Done-for-you Amazon management',
    price: '$999/mo',
    originalPrice: '$1,999/mo',
    badge: 'Amazon FBA Service',
    badgeColor: 'amazon',
    description: 'Full Amazon management: listings, PPC, inventory, and growth strategy.',
    features: [
      'Complete listing optimization',
      'PPC campaign setup & management',
      'Weekly performance reports',
      'Inventory & pricing monitoring',
      'Monthly strategy calls',
      '30-day cancellation anytime',
    ],
    bestFor: 'Sellers doing $10K+/mo wanting to scale',
    cta: 'Book Growth Strategy Call',
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
    badgeColor: 'violet',
    description: 'Custom website to build your brand, capture emails, and drive traffic to Amazon.',
    features: [
      'Custom brand website (5-7 pages)',
      'Mobile-responsive design',
      'Email capture & newsletter setup',
      'Blog for content marketing',
      'Social media integration',
      'SEO optimized for Google ranking',
      '1-week delivery',
    ],
    maintenance: {
      price: '$49/mo',
      description: 'Optional hosting & updates',
      includes: [
        'Hosting & SSL included',
        'Security updates',
        'Monthly backups',
        'Content updates (2/mo)',
        'Email support',
      ],
    },
    bestFor: 'Sellers ready to build a brand beyond Amazon',
    cta: 'Book Website Discovery Call',
  },
];

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
        { y: '4vh', opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          scrollTrigger: {
            trigger: headerRef.current,
            start: 'top 80%',
            end: 'top 60%',
            scrub: 0.5,
          },
        }
      );

      cardsRef.current.forEach((card) => {
        if (card) {
          gsap.fromTo(
            card,
            { y: '10vh', opacity: 0, scale: 0.98 },
            {
              y: 0,
              opacity: 1,
              scale: 1,
              duration: 0.6,
              scrollTrigger: {
                trigger: card,
                start: 'top 85%',
                end: 'top 55%',
                scrub: 0.5,
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
      className="relative z-60 bg-jungle py-24 lg:py-32"
    >
      {/* Background */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url('/images/violet_flower_bg.jpg')`,
          backgroundSize: 'cover',
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {/* Header */}
        <div ref={headerRef} className="text-center mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-neon/10 text-neon text-sm font-mono mb-4">
            Simple Pricing — No Hidden Fees
          </span>
          <h2 className="font-display text-[clamp(36px,4vw,64px)] font-black text-warm uppercase tracking-tight mb-4">
            Choose Your Path
          </h2>
          <p className="text-warm-72 text-lg max-w-xl mx-auto">
            Three ways to grow. Pick what fits your biggest pain point right now.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {packages.map((pkg, index) => (
            <div
              key={pkg.id}
              ref={(el) => { cardsRef.current[index] = el; }}
              className={`card-jungle card-hover p-6 lg:p-8 flex flex-col relative ${
                pkg.popular ? 'ring-2 ring-neon card-glow' : ''
              }`}
            >
              {/* Badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className={`text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wide ${
                  pkg.badgeColor === 'amazon'
                    ? 'bg-amazon text-[#232F3E]'
                    : pkg.badgeColor === 'violet'
                      ? 'bg-violet text-warm'
                      : pkg.popular 
                        ? 'bg-neon text-jungle' 
                        : 'bg-warm/20 text-warm'
                }`}>
                  {pkg.badge}
                </span>
              </div>

              {/* Icon & Name */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center ${
                  pkg.badgeColor === 'amazon' 
                    ? 'bg-amazon/20' 
                    : pkg.badgeColor === 'violet'
                      ? 'bg-violet/30'
                      : 'bg-neon/20'
                }`}>
                  <pkg.icon 
                    className={
                      pkg.badgeColor === 'amazon' 
                        ? 'text-amazon' 
                        : pkg.badgeColor === 'violet'
                          ? 'text-violet'
                          : 'text-neon'
                    } 
                    size={22} 
                  />
                </div>
                <div>
                  <h3 className="font-display text-xl lg:text-2xl font-bold text-warm uppercase">
                    {pkg.name}
                  </h3>
                  <p className={
                    pkg.badgeColor === 'amazon' 
                      ? 'text-amazon' 
                      : pkg.badgeColor === 'violet'
                        ? 'text-violet'
                        : 'text-neon text-sm'
                  }>
                    {pkg.tagline}
                  </p>
                </div>
              </div>

              {/* Price */}
              <div className="mb-4">
                <div className="flex items-baseline gap-2">
                  <span className={`font-mono text-3xl lg:text-4xl font-bold ${
                    pkg.badgeColor === 'amazon' 
                      ? 'text-amazon' 
                      : pkg.badgeColor === 'violet'
                        ? 'text-violet'
                        : 'text-neon'
                  }`}>
                    {pkg.price}
                  </span>
                  <span className="text-warm/40 line-through text-sm">
                    {pkg.originalPrice}
                  </span>
                </div>
                <p className="text-warm-72 text-sm mt-1">{pkg.description}</p>
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-4 flex-grow">
                {pkg.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check 
                      className={`flex-shrink-0 mt-0.5 ${
                        pkg.badgeColor === 'amazon' 
                          ? 'text-amazon' 
                          : pkg.badgeColor === 'violet'
                            ? 'text-violet'
                            : 'text-neon'
                      }`} 
                      size={16} 
                    />
                    <span className="text-warm-72 text-xs lg:text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Optional Maintenance Section */}
              {pkg.maintenance && (
                <div className="mt-auto mb-4 p-4 rounded-xl bg-warm/5 border border-warm/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="text-warm/50" size={14} />
                    <span className="text-warm-72 text-xs uppercase tracking-wide">
                      Optional: {pkg.maintenance.description}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className={`font-mono text-xl font-bold ${
                      pkg.badgeColor === 'amazon' 
                        ? 'text-amazon' 
                        : pkg.badgeColor === 'violet'
                          ? 'text-violet'
                          : 'text-neon'
                    }`}>
                      {pkg.maintenance.price}
                    </span>
                    <span className="text-warm/50 text-xs">cancel anytime</span>
                  </div>
                  <ul className="space-y-1">
                    {pkg.maintenance.includes.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Check 
                          className={`flex-shrink-0 mt-0.5 opacity-60 ${
                            pkg.badgeColor === 'amazon' 
                              ? 'text-amazon' 
                              : pkg.badgeColor === 'violet'
                                ? 'text-violet'
                                : 'text-neon'
                          }`} 
                          size={12} 
                        />
                        <span className="text-warm/70 text-xs">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Best For */}
              <div className="p-3 rounded-xl bg-warm/5 mb-4">
                <p className="text-warm-72 text-xs uppercase tracking-wide mb-1">Best For</p>
                <p className="text-warm text-xs">{pkg.bestFor}</p>
              </div>

              {/* CTA */}
              <CalendlyButton 
                className="w-full justify-center text-sm"
                variant={pkg.popular ? 'primary' : 'secondary'}
              >
                {pkg.cta}
              </CalendlyButton>
            </div>
          ))}
        </div>

        {/* Bottom Note */}
        <div className="mt-12 text-center">
          <p className="text-warm-72 text-sm mb-4">
            Not sure which is right? Book a free 15-min call and we'll help you decide.
          </p>
          <CalendlyButton variant="secondary">
            Free 15-Min Consultation
          </CalendlyButton>
        </div>
      </div>
    </section>
  );
}
