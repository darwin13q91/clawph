import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { 
  ArrowLeft, 
  Clock, 
  Shield, 
  Zap, 
  MessageCircle,
  Award,
  TrendingUp,
  Users,
  Target,
  Sparkles,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import CalendlyButton from '../components/CalendlyButton';

// HashLink component for smooth scrolling to sections
function HashLink({ to, children, className }: { to: string; children: React.ReactNode; className?: string }) {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const hash = to.replace('/#', '').replace('#', '');
    navigate('/');
    setTimeout(() => {
      const element = document.getElementById(hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  return (
    <a href={to} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}

gsap.registerPlugin(ScrollTrigger);

const stats = [
  { value: '10+', label: 'Years Experience', icon: Clock },
  { value: '$50M+', label: 'Revenue Managed', icon: TrendingUp },
  { value: '10+', label: 'Accounts Managed', icon: Users },
  { value: '3', label: 'Continents', icon: Target },
];

const values = [
  {
    icon: Shield,
    title: 'Deep Amazon Expertise',
    description: 'From Seller Central support to managing accounts across US, UK, and EU marketplaces. We\'ve solved problems most agencies haven\'t even seen yet.',
  },
  {
    icon: Zap,
    title: 'Speed Over Perfection',
    description: '48-hour AI setup. 1-week Amazon optimization. We move fast because your business can\'t wait for month-long onboarding processes.',
  },
  {
    icon: Award,
    title: 'Prove It or Refund It',
    description: '30-day money-back guarantee. If we don\'t save you 5+ hours/week, you get 100% back. No questions asked, no hoops to jump through.',
  },
  {
    icon: MessageCircle,
    title: 'Founder-Led Service',
    description: 'You talk directly to the person building your solution. No account managers, no junior staff, no handoffs. Direct access to expertise.',
  },
];

const differentiators = [
  {
    icon: TrendingUp,
    title: 'Agencies charge $3K+/mo',
    highlight: 'We charge $997 one-time',
    description: 'Most agencies want retainers forever. We build you a system that runs without us, giving you true independence.',
  },
  {
    icon: Target,
    title: 'Generalists guess at Amazon',
    highlight: 'We\'ve lived it for a decade',
    description: 'From Seller Central support to multi-marketplace account management — we know every workflow, API, and edge case.',
  },
  {
    icon: Sparkles,
    title: 'VAs need training & management',
    highlight: 'AI delivers insights 24/7',
    description: 'Virtual assistants are great but need oversight. AI intelligence just works — continuous monitoring, instant recommendations when you need them.',
  },
];

const timeline = [
  {
    year: '2014',
    title: 'Started in the Trenches',
    description: 'Began in Amazon Seller Central support, handling 50+ tickets daily from frustrated sellers trying to navigate the platform.',
  },
  {
    year: '2016',
    title: 'Account Management',
    description: 'Moved to managing accounts directly, overseeing $2M+ monthly revenue across US, UK, and EU marketplaces simultaneously.',
  },
  {
    year: '2019',
    title: 'First Automations',
    description: 'Built the first automation scripts to handle repetitive tasks. Saved 15+ hours per week per account immediately.',
  },
  {
    year: '2024',
    title: 'amajungle Born',
    description: 'Launched amajungle to bring AI-powered automation to every Amazon seller tired of drowning in busywork.',
  },
];

export default function AboutPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const valuesRef = useRef<HTMLDivElement>(null);
  const diffRef = useRef<HTMLDivElement>(null);
  const guaranteeRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      // Hero animation
      gsap.fromTo(
        heroRef.current,
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: heroRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        }
      );

      // Stats stagger
      gsap.fromTo(
        '.stat-item',
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: statsRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        }
      );

      // Story section
      gsap.fromTo(
        storyRef.current,
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: storyRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        }
      );

      // Timeline items
      gsap.fromTo(
        '.timeline-item',
        { x: -30, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.15,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: timelineRef.current,
            start: 'top 75%',
            toggleActions: 'play none none none',
          },
        }
      );

      // Values cards
      gsap.fromTo(
        '.value-card',
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: valuesRef.current,
            start: 'top 75%',
            toggleActions: 'play none none none',
          },
        }
      );

      // Differentiators
      gsap.fromTo(
        '.diff-card',
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.15,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: diffRef.current,
            start: 'top 75%',
            toggleActions: 'play none none none',
          },
        }
      );

      // Guarantee
      gsap.fromTo(
        guaranteeRef.current,
        { y: 30, opacity: 0, scale: 0.98 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.7,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: guaranteeRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        }
      );
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen bg-jungle pt-20">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 px-6 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-30">
          <div className="absolute top-20 right-20 w-72 h-72 bg-neon-lime rounded-full blur-[120px]" />
          <div className="absolute bottom-20 right-40 w-96 h-96 bg-violet rounded-full blur-[150px]" />
        </div>

        <div ref={heroRef} className="relative z-10 max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-warm-72 hover:text-neon transition-colors duration-300 mb-8 group"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span>Back to Home</span>
            </Link>
          </motion.div>
          
          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-lime/10 border border-neon-lime/20 mb-6"
            >
              <span className="w-2 h-2 rounded-full bg-neon-lime animate-pulse" />
              <span className="text-neon text-sm font-mono">About amajungle</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="font-display text-4xl sm:text-5xl lg:text-7xl font-black text-warm uppercase tracking-tight leading-[0.95] mb-6"
            >
              A Decade in the
              <span className="block text-neon">Amazon Trenches</span>
          </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-warm-72 text-lg lg:text-xl leading-relaxed max-w-2xl"
            >
              From Seller Central support tickets to managing $50M+ in revenue across three continents. 
              We built amajungle because we were tired of watching sellers drown in busywork they shouldn't have to do.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section ref={statsRef} className="py-12 px-6 border-y border-warm/10 bg-jungle-dark/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {stats.map((stat, _index) => (
              <div 
                key={stat.label}
                className="stat-item text-center lg:text-left p-4 rounded-2xl bg-warm/5 border border-warm/5 hover:border-neon/20 transition-colors duration-300"
              >
                <div className="flex items-center justify-center lg:justify-start gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-neon/10 flex items-center justify-center">
                    <stat.icon className="text-neon" size={20} />
                  </div>
                  <span className="font-mono text-3xl lg:text-4xl font-bold text-neon">{stat.value}</span>
                </div>
                <p className="text-warm-72 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story Section with Timeline */}
      <section className="py-24 lg:py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
            {/* Left: Story Text */}
            <div ref={storyRef}>
              <span className="inline-block px-4 py-2 rounded-full bg-violet/20 text-violet-light text-sm font-mono mb-6">
                Our Story
              </span>
              <h2 className="font-display text-3xl lg:text-5xl font-black text-warm uppercase tracking-tight mb-6">
                Built by Amazon People,<br />
                <span className="text-neon">For Amazon People</span>
              </h2>
              <div className="space-y-4 text-warm-72 leading-relaxed">
                <p>
                  We didn't start as consultants looking for a niche. We started as the people 
                  handling 50+ support tickets a day from sellers who were stuck, frustrated, and 
                  losing money to platform complexity.
                </p>
                <p>
                  Every automation we built came from real pain. Every AI workflow was designed 
                  after watching sellers waste hours on tasks that should take minutes. We know 
                  what breaks because we've fixed it. We know what scales because we've built it.
                </p>
              </div>

              {/* Quote Card */}
              <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-warm/10 to-warm/5 border border-warm/10">
                <blockquote className="text-warm text-lg italic leading-relaxed mb-4">
                  "The sellers who succeeded weren't the ones working hardest. They were the ones 
                  who automated the busywork and focused on strategy."
                </blockquote>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-neon/20 flex items-center justify-center">
                    <span className="text-neon font-bold text-lg">A</span>
                  </div>
                  <div>
                    <p className="text-warm font-semibold">Founder, amajungle</p>
                    <p className="text-warm-72 text-sm">10 Years in Amazon Operations</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Timeline */}
            <div ref={timelineRef} className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-neon/50 via-neon/20 to-transparent" />
              
              <div className="space-y-8">
                {timeline.map((item, _index) => (
                  <div key={item.year} className="timeline-item relative pl-16">
                    <div className="absolute left-0 top-0 w-12 h-12 rounded-full bg-jungle border-2 border-neon flex items-center justify-center">
                      <span className="text-neon font-mono font-bold text-sm">{item.year.slice(-2)}</span>
                    </div>
                    <div className="pt-1">
                      <span className="text-neon font-mono text-sm">{item.year}</span>
                      <h3 className="font-display text-xl font-bold text-warm mt-1 mb-2">{item.title}</h3>
                      <p className="text-warm-72 text-sm leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section ref={valuesRef} className="py-24 lg:py-32 px-6 bg-jungle-dark/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 rounded-full bg-neon/10 text-neon text-sm font-mono mb-4">
              How We Work
            </span>
            <h2 className="font-display text-3xl lg:text-5xl font-black text-warm uppercase tracking-tight mb-4">
              Our Principles
            </h2>
            <p className="text-warm-72 text-lg max-w-2xl mx-auto">
              The non-negotiable standards that guide every decision we make.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {values.map((value) => (
              <div 
                key={value.title}
                className="value-card group p-8 rounded-3xl bg-warm/5 border border-warm/10 hover:border-neon/30 hover:bg-warm/10 transition-all duration-500"
              >
                <div className="w-14 h-14 rounded-2xl bg-neon/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-neon/20 transition-all duration-300">
                  <value.icon className="text-neon" size={28} />
                </div>
                <h3 className="font-display text-xl lg:text-2xl font-bold text-warm uppercase mb-3">
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

      {/* Why Different Section */}
      <section ref={diffRef} className="py-24 lg:py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 rounded-full bg-amazon/20 text-amazon text-sm font-mono mb-4">
              Why Choose Us
            </span>
            <h2 className="font-display text-3xl lg:text-5xl font-black text-warm uppercase tracking-tight mb-4">
              Not Another Agency
            </h2>
            <p className="text-warm-72 text-lg max-w-2xl mx-auto">
              We're not consultants who learned Amazon from YouTube. We built this after a decade in the trenches.
            </p>
          </div>

          <div className="space-y-6">
            {differentiators.map((item, _index) => (
              <div 
                key={item.title}
                className="diff-card flex flex-col lg:flex-row lg:items-center gap-6 p-6 lg:p-8 rounded-3xl bg-warm/5 border border-warm/10 hover:border-neon/20 transition-all duration-300"
              >
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-neon/10 flex items-center justify-center">
                  <item.icon className="text-neon" size={32} />
                </div>
                <div className="flex-grow">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4 mb-2">
                    <p className="text-warm-72 text-sm">{item.title}</p>
                    <ArrowRight size={16} className="text-neon hidden lg:block" />
                    <p className="text-neon font-display text-lg lg:text-xl font-bold uppercase">{item.highlight}</p>
                  </div>
                  <p className="text-warm-72 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Guarantee Section */}
      <section className="py-24 lg:py-32 px-6 bg-gradient-to-b from-jungle to-jungle-dark">
        <div ref={guaranteeRef} className="max-w-4xl mx-auto">
          <div className="relative p-8 lg:p-12 rounded-[2rem] bg-gradient-to-br from-neon-lime/10 via-warm/5 to-transparent border border-neon-lime/30 overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-neon-lime/10 rounded-full blur-[80px]" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet/20 rounded-full blur-[60px]" />
            
            <div className="relative z-10 text-center">
              <div className="w-20 h-20 rounded-full bg-neon/20 flex items-center justify-center mx-auto mb-8">
                <Shield className="text-neon" size={40} />
              </div>
              
              <h2 className="font-display text-2xl lg:text-4xl font-black text-warm uppercase tracking-tight mb-6">
                The 30-Day<br />
                <span className="text-neon">"It Works Or You Don't Pay"</span><br />
                Guarantee
              </h2>
              
              <div className="max-w-2xl mx-auto mb-8">
                <p className="text-warm-72 text-lg mb-6">
                  Within 30 days, your AI agent must:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  {[
                    'Deliver 1+ actionable insight daily',
                    'Save you 5+ hours per week',
                    'Work via Telegram as promised'
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-warm/5">
                      <CheckCircle2 className="text-neon flex-shrink-0" size={18} />
                      <span className="text-warm text-sm">{item}</span>
                    </div>
                  ))}
                </div>
                
                <div className="p-6 rounded-2xl bg-neon/10 border border-neon/20">
                  <p className="text-warm font-semibold mb-2">If it doesn't, we will:</p>
                  <ul className="space-y-2 text-warm-72 text-sm">
                    <li className="flex items-center gap-2">
                      <span className="text-neon">✓</span> Refund 100% of your setup fee — no questions
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-neon">✓</span> Let you keep the system (it's open source, you own it)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-neon">✓</span> Give you a free 1-hour consultation on what went wrong
                    </li>
                  </ul>
                </div>
              </div>

              <p className="text-warm-72 text-sm italic">
                "We spent a decade managing Amazon accounts. Now we deliver intelligence that helps you manage them better."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 lg:py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="card-elevated p-8 lg:p-16 text-center">
            <div className="w-16 h-16 rounded-full bg-neon/20 flex items-center justify-center mx-auto mb-6">
              <MessageCircle className="text-neon" size={32} />
            </div>
            <h2 className="font-display text-2xl lg:text-4xl font-black text-warm uppercase tracking-tight mb-4">
              Let's Build Something Together
            </h2>
            <p className="text-warm-72 text-lg mb-8 max-w-md mx-auto">
              Book a free 30-minute call. Tell us about your business. We'll tell you 
              exactly how we can help — no pitch, no pressure.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <CalendlyButton className="w-full sm:w-auto">
                Book Free Strategy Call
              </CalendlyButton>
              <Link 
                to="/" 
                className="btn-secondary w-full sm:w-auto"
              >
                Explore Services
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}