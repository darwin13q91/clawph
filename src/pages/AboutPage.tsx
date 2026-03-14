import { useRef, useLayoutEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowLeft, Clock, Shield, Zap, MessageCircle, Menu, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import CalendlyButton from '../components/CalendlyButton';
import AnimatedLogo from '../components/AnimatedLogo';

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
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleHashLink = (e: React.MouseEvent, to: string) => {
    e.preventDefault();
    navigate(to);
  };

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
          
          {/* Desktop Back Link */}
          <Link 
            to="/" 
            className="hidden md:flex items-center gap-2 text-warm-72 hover:text-warm transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">Back to home</span>
          </Link>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-warm p-2 rounded-lg hover:bg-warm/10 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div
        className={`fixed inset-0 z-40 bg-jungle/98 backdrop-blur-lg transition-all duration-300 md:hidden ${
          isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation menu"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setIsMobileMenuOpen(false);
          }
        }}
      >
        <div className="flex flex-col items-center justify-center h-full gap-6 pt-20">
          <Link 
            to="/" 
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-2 text-warm text-xl font-display font-bold py-3 px-6 rounded-xl hover:bg-warm/10 transition-colors focus-visible:outline-2 focus-visible:outline-neon focus-visible:outline-offset-2"
          >
            <ArrowLeft size={20} />
            Back to home
          </Link>
          <Link 
            to="/#pricing" 
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-warm text-xl font-display font-bold py-3 px-6 rounded-xl hover:bg-warm/10 transition-colors focus-visible:outline-2 focus-visible:outline-neon focus-visible:outline-offset-2"
          >
            Pricing
          </Link>
          <Link 
            to="/#contact" 
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-warm text-xl font-display font-bold py-3 px-6 rounded-xl hover:bg-warm/10 transition-colors focus-visible:outline-2 focus-visible:outline-neon focus-visible:outline-offset-2"
          >
            Contact
          </Link>
          <div onClick={() => setIsMobileMenuOpen(false)} className="mt-4">
            <CalendlyButton>Book a Call</CalendlyButton>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 lg:px-12">
        <div ref={heroRef} className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-4 py-2 rounded-full bg-neon/10 text-neon text-sm font-mono mb-6">
            About Us
          </span>
          <h1 className="font-display text-[clamp(36px,5vw,72px)] font-black text-warm uppercase tracking-tight mb-6 leading-[0.95]">
            10 Years of Amazon.<br />
            <span className="text-neon">Now Powered by AI.</span>
          </h1>
          <p className="text-warm-72 text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed">
            amajungle is built on a decade of hands-on Amazon experience — from Seller Central support 
            to managing multi-marketplace accounts across the US, UK, and EU. We combined that expertise 
            with AI intelligence so you can scale faster with less effort.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <CalendlyButton>Book a free call</CalendlyButton>
            <a href="/#pricing" onClick={(e) => handleHashLink(e, '/#pricing')} className="btn-secondary">
              See pricing
            </a>
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
          
          {/* Founder Photo */}
          <div className="my-12 flex justify-center">
            <div className="relative">
              <div className="w-48 h-64 md:w-56 md:h-72 rounded-2xl overflow-hidden border-4 border-neon/30 shadow-lg shadow-neon/10">
                <img 
                  src="/images/founder.png" 
                  alt="Allysa Kate Estardo — Founder of amajungle" 
                  className="w-full h-full object-cover object-[center_15%]"
                  loading="lazy"
                />
              </div>
            </div>
          </div>

          <div className="space-y-6 text-warm-72 text-lg leading-relaxed">
            <p>
              amajungle started with a simple question: why are Amazon sellers still doing 
              everything manually when AI can handle 80% of the work?
            </p>
            <p>
              Our founder, Allysa Kate Estardo, spent over a decade in the Amazon ecosystem. 
              She started at Teleperformance, helping sellers navigate account concerns, subscription fees, 
              listings, and shipment discrepancies across FBM, FBA, and ILAC platforms.
            </p>
            <p>
              At Nieboo UK, she managed product listings end-to-end — optimizing for visibility 
              and sales, creating shipments, monitoring inventory, and correcting errors. 
              At Sweese, she ran multi-platform support across Amazon, Shopify, Facebook, 
              Instagram, and the brand's own website.
            </p>
            <p>
              As an Amazon Technician at Machete Systems, she managed up to 10 accounts 
              simultaneously, leading teams from the Philippines and India. She handled 
              account management, inventory control, SEO, PPC campaigns, and customer 
              service — driving measurable improvements in sales and satisfaction.
            </p>
            <p>
              Most recently, as an Amazon Account Health Manager at Camden Pharma, she 
              led teams managing multiple accounts across US, UK, and all EU marketplaces — 
              overseeing violations, restrictions, IP rights, stranded inventory, and policy compliance.
            </p>
            <p className="text-warm font-medium">
              After 10 years of solving the same problems manually, she built amajungle 
              to combine deep Amazon expertise with AI intelligence — so sellers can finally 
              focus on growth instead of busywork.
            </p>
          </div>

          {/* Signature */}
          <div className="mt-12 flex items-center gap-4 justify-center">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-neon/30">
              <img 
                src="/images/founder.png" 
                alt="Allysa Kate Estardo" 
                className="w-full h-full object-cover object-top"
                loading="lazy"
              />
            </div>
            <div className="text-left">
              <p className="text-warm font-medium">Allysa Kate Estardo</p>
              <p className="text-warm-72 text-sm">Founder, amajungle</p>
              <p className="text-warm-72 text-xs">10 Years Amazon Experience • All Around Account Management</p>
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
            <a href="/#pricing" onClick={(e) => handleHashLink(e, '/#pricing')} className="text-warm-72 hover:text-warm transition-colors text-sm">
              Pricing
            </a>
            <a href="/#faq" onClick={(e) => handleHashLink(e, '/#faq')} className="text-warm-72 hover:text-warm transition-colors text-sm">
              FAQ
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
