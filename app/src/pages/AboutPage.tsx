import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowLeft, Clock, Shield, Zap, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import CalendlyButton from '../components/CalendlyButton';
import AnimatedLogo from '../components/AnimatedLogo';

gsap.registerPlugin(ScrollTrigger);

const values = [
  {
    icon: Shield,
    title: 'Own Your Tech',
    description: 'We build AI agents that run on YOUR hardware. No SaaS lock-in, no monthly subscriptions. You own everything.',
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
    description: 'You talk to the person building your solution. No account managers, no handoffs. Direct access.',
  },
];

const whyDifferent = [
  {
    title: 'Agencies charge $3K+/mo',
    subtitle: 'We charge $997 one-time',
    description: 'Most agencies want retainers forever. We build you a system that runs without us.',
  },
  {
    title: 'AI tools charge monthly',
    subtitle: 'You own your agent',
    description: 'ChatGPT, Jasper, etc. — all SaaS. We build on your hardware. One fee, yours forever.',
  },
  {
    title: 'VAs need training & management',
    subtitle: 'AI works 24/7 instantly',
    description: 'Virtual assistants are great but need oversight. AI agents just... work. While you sleep.',
  },
];

export default function AboutPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLDivElement>(null);
  const valuesRef = useRef<HTMLDivElement>(null);
  const differentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        heroRef.current,
        { y: '4vh', opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          scrollTrigger: {
            trigger: heroRef.current,
            start: 'top 80%',
            end: 'top 50%',
            scrub: 0.5,
          },
        }
      );

      gsap.fromTo(
        storyRef.current,
        { y: '6vh', opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          scrollTrigger: {
            trigger: storyRef.current,
            start: 'top 80%',
            end: 'top 55%',
            scrub: 0.5,
          },
        }
      );

      gsap.fromTo(
        valuesRef.current,
        { y: '6vh', opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          scrollTrigger: {
            trigger: valuesRef.current,
            start: 'top 80%',
            end: 'top 55%',
            scrub: 0.5,
          },
        }
      );

      gsap.fromTo(
        differentRef.current,
        { y: '6vh', opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          scrollTrigger: {
            trigger: differentRef.current,
            start: 'top 80%',
            end: 'top 55%',
            scrub: 0.5,
          },
        }
      );
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen bg-jungle">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-jungle/90 backdrop-blur-md py-4">
        <div className="w-full px-6 lg:px-12 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <AnimatedLogo size={40} />
            <span className="font-display text-2xl font-bold text-warm tracking-tight hidden sm:block">
              amajungle
            </span>
          </Link>
          <Link 
            to="/" 
            className="flex items-center gap-2 text-warm-72 hover:text-warm transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">Back to home</span>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 lg:px-12">
        <div ref={heroRef} className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-4 py-2 rounded-full bg-neon/10 text-neon text-sm font-mono mb-6">
            About Us
          </span>
          <h1 className="font-display text-[clamp(36px,5vw,72px)] font-black text-warm uppercase tracking-tight mb-6 leading-[0.95]">
            We're New.<br />
            <span className="text-neon">We're Hungry.</span><br />
            And We Guarantee Results.
          </h1>
          <p className="text-warm-72 text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed">
            amajungle is a new agency, but our founder spent 3 years scaling an Amazon FBA business 
            to 7 figures. We built the AI tools and systems we wish we had back then.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <CalendlyButton>Book a free call</CalendlyButton>
            <Link to="/#pricing" className="btn-secondary">
              See pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-24 px-6 lg:px-12 border-y border-warm/10">
        <div ref={storyRef} className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-[clamp(32px,4vw,48px)] font-black text-warm uppercase tracking-tight mb-4">
              Why We Exist
            </h2>
          </div>
          
          <div className="space-y-6 text-warm-72 text-lg leading-relaxed">
            <p>
              In 2022, I was running an Amazon FBA business doing $50K/month. Life was good — 
              except I was spending 15+ hours a week on repetitive tasks: checking inventory, 
              monitoring PPC, updating prices, responding to the same customer questions.
            </p>
            <p>
              I tried hiring VAs. Trained them for weeks. They made mistakes. They quit. 
              I tried agencies. $3,000/month retainers with nothing to show for it.
            </p>
            <p>
              Then I discovered AI agents. I built my first automation — a Telegram bot that 
              checked my inventory every morning and sent me alerts. It took 2 hours to build. 
              It saved me 5 hours every week. Forever.
            </p>
            <p>
              I built more. A PPC monitor. A pricing tracker. A customer service responder. 
              Within 3 months, I had 20+ automations running 24/7. My "work" became checking 
              Telegram notifications and making decisions.
            </p>
            <p className="text-warm font-medium">
              That's what amajungle is. We build those automations for you. In 48 hours. 
              For a one-time fee. So you can focus on growth instead of busywork.
            </p>
          </div>

          {/* Signature */}
          <div className="mt-12 flex items-center gap-4 justify-center">
            <div className="w-16 h-16 rounded-full bg-neon/20 flex items-center justify-center">
              <span className="text-neon font-bold text-xl">JD</span>
            </div>
            <div className="text-left">
              <p className="text-warm font-medium">Jayson Delos Santos</p>
              <p className="text-warm-72 text-sm">Founder, amajungle</p>
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
              <li>✓ Run at least 1 successful automation per day</li>
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
            "We're new. We have to be this good to earn your trust."
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
            Book a free 15-minute call. Tell me about your business. I'll tell you 
            exactly how we can help — no pitch, no pressure.
          </p>
          <CalendlyButton className="mx-auto" />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 lg:px-12 border-t border-warm/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-3">
            <AnimatedLogo size={32} />
            <span className="font-display text-2xl font-bold text-warm tracking-tight">
              amajungle
            </span>
          </Link>
          <p className="text-warm-72 text-sm">
            © {new Date().getFullYear()} amajungle. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link to="/" className="text-warm-72 hover:text-warm transition-colors text-sm">
              Home
            </Link>
            <Link to="/#pricing" className="text-warm-72 hover:text-warm transition-colors text-sm">
              Pricing
            </Link>
            <Link to="/#faq" className="text-warm-72 hover:text-warm transition-colors text-sm">
              FAQ
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
