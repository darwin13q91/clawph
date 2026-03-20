import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowLeft, Clock, Shield, Zap, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import CalendlyButton from '../components/CalendlyButton';

gsap.registerPlugin(ScrollTrigger);

const values = [
  {
    icon: Shield,
    title: '10 Years in Amazon',
    description: 'From Seller Central support to managing 10+ accounts across US, UK, and EU marketplaces. We\'ve seen every problem — and solved it.',
  },
  {
    icon: Clock,
    title: 'Speed Over Perfection',
    description: '48-hour AI setup. 1-week Amazon optimization. We move fast because your business can\'t wait.',
  },
  {
    icon: Zap,
    title: 'Prove It or Refund It',
    description: '30-day money-back guarantee. If we don\'t save you 5+ hours/week, you get 100% back. No questions.',
  },
  {
    icon: MessageCircle,
    title: 'Founder-Led',
    description: 'You talk directly to the person managing your account. No junior staff, no handoffs. Direct access.',
  },
];

const whyDifferent = [
  {
    title: 'Agencies charge $3K+/mo',
    subtitle: 'We charge $997 one-time',
    description: 'Most agencies want retainers forever. We build you a system that runs without us.',
  },
  {
    title: 'Generalists guess at Amazon',
    subtitle: 'We\'ve lived it for a decade',
    description: 'From Seller Central support to multi-marketplace account management — we know every workflow inside out.',
  },
  {
    title: 'VAs need training & management',
    subtitle: 'AI delivers insights 24/7 instantly',
    description: 'Virtual assistants are great but need oversight. AI intelligence just... works. Continuous monitoring, instant recommendations when you need them.',
  },
];

export default function AboutPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLDivElement>(null);
  const valuesRef = useRef<HTMLDivElement>(null);
  const differentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      // Simpler animations without scrub for smoother scroll
      gsap.fromTo(
        heroRef.current,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: heroRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        }
      );

      gsap.fromTo(
        storyRef.current,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: storyRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        }
      );

      gsap.fromTo(
        valuesRef.current,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: valuesRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        }
      );

      gsap.fromTo(
        differentRef.current,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: differentRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        }
      );
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen bg-jungle pt-16">
      {/* Hero */}
      <section className="pt-32 pb-24 px-6 lg:px-12">
        <div ref={heroRef} className="max-w-4xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-warm-72 hover:text-warm transition-colors mb-8">
            <ArrowLeft size={20} />
            <span>Back to Home</span>
          </Link>
          
          <h1 className="font-display text-[clamp(40px,6vw,64px)] font-black text-warm uppercase tracking-tight leading-[0.95] mb-6">
            We\'ve Spent a Decade in the Amazon Trenches
          </h1>
          <p className="text-warm-72 text-xl leading-relaxed max-w-2xl">
            From Seller Central support tickets to managing 10+ accounts across three continents. 
            We built amajungle because we were tired of watching sellers drown in busywork.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-24 px-6 lg:px-12 bg-jungle-light">
        <div ref={storyRef} className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-[clamp(28px,3vw,40px)] font-black text-warm uppercase tracking-tight mb-6">
                The Real Story
              </h2>
              <div className="space-y-4 text-warm-72 leading-relaxed">
                <p>
                  <strong className="text-warm">2014:</strong> Started in Amazon Seller Central support, 
                  handling 50+ tickets daily from frustrated sellers.
                </p>
                <p>
                  <strong className="text-warm">2016:</strong> Moved to account management, overseeing 
                  $2M+ monthly revenue across US, UK, and EU.
                </p>
                <p>
                  <strong className="text-warm">2019:</strong> Built first automation scripts to handle 
                  repetitive tasks. Saved 15+ hours/week per account.
                </p>
                <p>
                  <strong className="text-warm">2024:</strong> Launched amajungle to bring AI automation 
                  to every Amazon seller who\'s tired of the grind.
                </p>
              </div>
            </div>
            <div className="card-jungle p-8">
              <blockquote className="text-warm text-lg italic leading-relaxed mb-6">
                "The sellers who succeeded weren\'t the ones working hardest. 
                They were the ones who automated the busywork and focused on strategy."
              </blockquote>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-neon/20 flex items-center justify-center">
                  <span className="text-neon font-bold">A</span>
                </div>
                <div>
                  <p className="text-warm font-medium">Founder</p>
                  <p className="text-warm-72 text-sm">10 Years in Amazon</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 px-6 lg:px-12 bg-jungle-light">
        <div ref={valuesRef} className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-[clamp(32px,4vw,48px)] font-black text-warm uppercase tracking-tight mb-4">
              How We Work
            </h2>
            <p className="text-warm-72 text-lg max-w-md mx-auto">
              The principles that guide everything we build.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {values.map((value) => (
              <div key={value.title} className="card-jungle p-8">
                <div className="w-12 h-12 rounded-full bg-neon/20 flex items-center justify-center mb-4">
                  <value.icon className="text-neon" size={24} />
                </div>
                <h3 className="font-display text-xl font-bold text-warm uppercase mb-3">
                  {value.title}
                </h3>
                <p className="text-warm-72 leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why We're Different */}
      <section className="py-24 px-6 lg:px-12">
        <div ref={differentRef} className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-[clamp(32px,4vw,48px)] font-black text-warm uppercase tracking-tight mb-4">
              Why We're Different
            </h2>
            <p className="text-warm-72 text-lg max-w-md mx-auto">
              Not another agency. Not another SaaS.
            </p>
          </div>

          <div className="space-y-8">
            {whyDifferent.map((item, index) => (
              <div 
                key={item.title} 
                className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8 p-6 rounded-2xl bg-warm/5 border border-warm/10"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-neon/20 flex items-center justify-center">
                  <span className="text-neon font-bold">{index + 1}</span>
                </div>
                <div className="flex-grow">
                  <p className="text-warm-72 text-sm mb-1">{item.title}</p>
                  <p className="text-neon font-display text-xl font-bold uppercase">{item.subtitle}</p>
                </div>
                <div className="md:w-64">
                  <p className="text-warm-72 text-sm">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Guarantee */}
      <section className="py-24 px-6 lg:px-12 bg-neon/5">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-20 h-20 rounded-full bg-neon/20 flex items-center justify-center mx-auto mb-8">
            <Shield className="text-neon" size={40} />
          </div>
          <h2 className="font-display text-[clamp(28px,3vw,40px)] font-black text-warm uppercase tracking-tight mb-6">
            The 30-Day "It Works Or You Don't Pay" Guarantee
          </h2>
          <div className="space-y-4 text-warm-72 text-lg mb-10">
            <p>
              Within 30 days, your AI agent must:
            </p>
            <ul className="space-y-2 text-warm">
              <li>✓ Receive at least 1 actionable insight per day</li>
              <li>✓ Save you a minimum of 5 hours per week</li>
              <li>✓ Work via Telegram as demonstrated</li>
            </ul>
            <p className="mt-6">
              If it doesn't, we will:
            </p>
            <ul className="space-y-2">
              <li className="text-neon font-medium">✓ Refund 100% of your setup fee</li>
              <li>✓ Let you keep the system (open source — you own it)</li>
              <li>✓ Give you a free 1-hour consultation on what went wrong</li>
            </ul>
          </div>
          <p className="text-warm-72 text-sm italic">
            "We spent a decade managing Amazon accounts. Now we deliver intelligence that helps you manage them better."
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 lg:px-12">
        <div className="max-w-4xl mx-auto text-center card-jungle p-12 lg:p-16">
          <h2 className="font-display text-[clamp(28px,3vw,40px)] font-black text-warm uppercase tracking-tight mb-4">
            Let's Build Something Together
          </h2>
          <p className="text-warm-72 text-lg mb-8 max-w-md mx-auto">
            Book a free 30-minute call. Tell us about your business. We'll tell you 
            exactly how we can help — no pitch, no pressure.
          </p>
          <CalendlyButton className="mx-auto" />
        </div>
      </section>
    </div>
  );
}