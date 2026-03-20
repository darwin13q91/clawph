import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
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
  ArrowRight,
} from 'lucide-react';
import CalendlyButton from '../components/CalendlyButton';
import BackgroundAnimation from '../components/BackgroundAnimation';

interface Stat {
  value: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

interface Value {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
}

interface Differentiator {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  highlight: string;
  description: string;
}

interface TimelineItem {
  year: string;
  title: string;
  description: string;
}

const stats: Stat[] = [
  { value: '10+', label: 'Years Experience', icon: Clock },
  { value: '$50M+', label: 'Revenue Managed', icon: TrendingUp },
  { value: '10+', label: 'Accounts Managed', icon: Users },
  { value: '3', label: 'Continents', icon: Target },
];

const values: Value[] = [
  {
    icon: Shield,
    title: 'Deep Amazon Expertise',
    description:
      "From Seller Central support to managing accounts across US, UK, and EU marketplaces. We've solved problems most agencies haven't even seen yet.",
  },
  {
    icon: Zap,
    title: 'Speed Over Perfection',
    description:
      "48-hour AI setup. 1-week Amazon optimization. We move fast because your business can't wait for month-long onboarding processes.",
  },
  {
    icon: Award,
    title: 'Prove It or Refund It',
    description:
      '30-day money-back guarantee. If we don\'t save you 5+ hours/week, you get 100% back. No questions asked, no hoops to jump through.',
  },
  {
    icon: MessageCircle,
    title: 'Founder-Led Service',
    description:
      'You talk directly to the person building your solution. No account managers, no junior staff, no handoffs. Direct access to expertise.',
  },
];

const differentiators: Differentiator[] = [
  {
    icon: TrendingUp,
    title: 'Agencies charge $3K+/mo',
    highlight: 'We charge $997 one-time',
    description:
      'Most agencies want retainers forever. We build you a system that runs without us, giving you true independence.',
  },
  {
    icon: Target,
    title: 'Generalists guess at Amazon',
    highlight: "We've lived it for a decade",
    description:
      'From Seller Central support to multi-marketplace account management — we know every workflow, API, and edge case.',
  },
  {
    icon: Sparkles,
    title: 'VAs need training & management',
    highlight: 'AI delivers insights 24/7',
    description:
      'Virtual assistants are great but need oversight. AI intelligence just works — continuous monitoring, instant recommendations when you need them.',
  },
];

const timeline: TimelineItem[] = [
  {
    year: '2014',
    title: 'Started in the Trenches',
    description:
      'Began in Amazon Seller Central support, handling 50+ tickets daily from frustrated sellers trying to navigate the platform.',
  },
  {
    year: '2016',
    title: 'Account Management',
    description:
      'Moved to managing accounts directly, overseeing $2M+ monthly revenue across US, UK, and EU marketplaces simultaneously.',
  },
  {
    year: '2019',
    title: 'First Automations',
    description:
      'Built the first automation scripts to handle repetitive tasks. Saved 15+ hours per week per account immediately.',
  },
  {
    year: '2024',
    title: 'amajungle Born',
    description:
      'Launched amajungle to bring AI-powered automation to every Amazon seller tired of drowning in busywork.',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

export default function AboutPage() {
  const heroRef = useRef(null);
  const statsRef = useRef(null);
  const storyRef = useRef(null);
  const timelineRef = useRef(null);
  const valuesRef = useRef(null);
  const diffRef = useRef(null);
  const guaranteeRef = useRef(null);
  const ctaRef = useRef(null);

  const heroInView = useInView(heroRef, { once: true });
  const statsInView = useInView(statsRef, { once: true, margin: '-100px' });
  const storyInView = useInView(storyRef, { once: true, margin: '-100px' });
  const timelineInView = useInView(timelineRef, { once: true, margin: '-100px' });
  const valuesInView = useInView(valuesRef, { once: true, margin: '-100px' });
  const diffInView = useInView(diffRef, { once: true, margin: '-100px' });
  const guaranteeInView = useInView(guaranteeRef, { once: true, margin: '-100px' });
  const ctaInView = useInView(ctaRef, { once: true, margin: '-100px' });

  return (
    <div className="min-h-screen bg-jungle-800 pt-20">
      {/* Particle Background Animation */}
      <BackgroundAnimation />

      {/* Hero Section */}
      <section ref={heroRef} className="relative section-xl overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-30 pointer-events-none">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-20 right-20 w-72 h-72 bg-neon-500/20 rounded-full blur-[120px]"
          />
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.15, 0.3, 0.15],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            className="absolute bottom-20 right-40 w-96 h-96 bg-violet-500/20 rounded-full blur-[150px]"
          />
        </div>

        <div className="container-base relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={heroInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-warm-400 hover:text-neon-500 transition-colors mb-8 group"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" aria-hidden="true" />
              <span>Back to Home</span>
            </Link>
          </motion.div>

          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-500/10 border border-neon-500/20 mb-6"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-500" />
              </span>
              <span className="text-neon text-sm font-mono">About amajungle</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="font-display text-4xl sm:text-5xl lg:text-7xl font-black text-warm uppercase tracking-tight leading-[0.95] mb-6"
            >
              A Decade in the
              <span className="block text-gradient mt-2">Amazon Trenches</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-warm-400 text-lg lg:text-xl leading-relaxed max-w-2xl"
            >
              From Seller Central support tickets to managing $50M+ in revenue across three
              continents. We built amajungle because we were tired of watching sellers drown
              in busywork they shouldn\'t have to do.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section ref={statsRef} className="border-y border-warm/10 bg-jungle-900/50 section-md">
        <div className="container-base">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={statsInView ? 'visible' : 'hidden'}
            className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8"
          >
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                variants={itemVariants}
                className="text-center lg:text-left p-5 rounded-2xl bg-warm/5 border border-warm/5 hover:border-neon-500/20 transition-colors"
              >
                <div className="flex items-center justify-center lg:justify-start gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-neon-500/10 flex items-center justify-center">
                    <stat.icon className="text-neon-500" size={20} aria-hidden="true" />
                  </div>
                  <span className="font-mono text-3xl lg:text-4xl font-bold text-neon-500">
                    {stat.value}
                  </span>
                </div>
                <p className="text-warm-400 text-sm">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Story Section with Timeline */}
      <section className="section-xl">
        <div className="container-base">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
            {/* Left: Story Text */}
            <motion.div
              ref={storyRef}
              initial={{ opacity: 0, y: 30 }}
              animate={storyInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-block px-4 py-2 rounded-full bg-violet-500/20 text-violet-400 text-sm font-mono mb-6">
                Our Story
              </div>
              
              <h2 className="font-display text-3xl lg:text-5xl font-black text-warm uppercase tracking-tight mb-6">
                Built by Amazon People,
                <span className="block text-gradient mt-2">For Amazon People</span>
              </h2>
              
              <div className="space-y-4 text-warm-400 leading-relaxed">
                <p>
                  We didn\'t start as consultants looking for a niche. We started as the people
                  handling 50+ support tickets a day from sellers who were stuck, frustrated, and
                  losing money to platform complexity.
                </p>
                <p>
                  Every automation we built came from real pain. Every AI workflow was designed
                  after watching sellers waste hours on tasks that should take minutes. We know
                  what breaks because we\'ve fixed it. We know what scales because we\'ve built it.
                </p>
              </div>

              {/* Quote Card */}
              <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-warm/10 to-warm/5 border border-warm/10">
                <blockquote className="text-warm text-lg italic leading-relaxed mb-4">
                  "The sellers who succeeded weren\'t the ones working hardest. They were the ones
                  who automated the busywork and focused on strategy."
                </blockquote>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-neon-500/20 flex items-center justify-center">
                    <span className="text-neon-500 font-bold text-lg">A</span>
                  </div>
                  <div>
                    <p className="text-warm font-semibold">Founder, amajungle</p>
                    <p className="text-warm-400 text-sm">10 Years in Amazon Operations</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right: Timeline */}
            <motion.div
              ref={timelineRef}
              initial={{ opacity: 0, x: 30 }}
              animate={timelineInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-neon-500/50 via-neon-500/20 to-transparent hidden sm:block" />

              <div className="space-y-8">
                {timeline.map((item, index) => (
                  <motion.div
                    key={item.year}
                    initial={{ opacity: 0, x: -20 }}
                    animate={timelineInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                    className="relative pl-16"
                  >
                    <div className="absolute left-0 top-0 w-12 h-12 rounded-full bg-jungle-800 border-2 border-neon-500 flex items-center justify-center hidden sm:flex">
                      <span className="text-neon-500 font-mono font-bold text-sm">{item.year.slice(-2)}</span>
                    </div>
                    <div className="pt-1">
                      <span className="text-neon-500 font-mono text-sm">{item.year}</span>
                      <h3 className="font-display text-xl font-bold text-warm mt-1 mb-2">
                        {item.title}
                      </h3>
                      <p className="text-warm-400 text-sm leading-relaxed">{item.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section ref={valuesRef} className="section-xl bg-jungle-900/30">
        <div className="container-base">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={valuesInView ? { opacity: 1, y: 0 } : {}}
              className="inline-block px-4 py-2 rounded-full bg-neon-500/10 text-neon text-sm font-mono mb-4"
            >
              How We Work
            </motion.div>
            
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={valuesInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1 }}
              className="font-display text-3xl lg:text-5xl font-black text-warm uppercase tracking-tight mb-4"
            >
              Our Principles
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={valuesInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 }}
              className="text-warm-400 text-lg max-w-2xl mx-auto"
            >
              The non-negotiable standards that guide every decision we make.
            </motion.p>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={valuesInView ? 'visible' : 'hidden'}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {values.map((value) => (
              <motion.div
                key={value.title}
                variants={itemVariants}
                whileHover={{ y: -4 }}
                className="group p-8 rounded-3xl bg-warm/5 border border-warm/10 hover:border-neon-500/30 hover:bg-warm/10 transition-all duration-500"
              >
                <div className="w-14 h-14 rounded-2xl bg-neon-500/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-neon-500/20 transition-all duration-300">
                  <value.icon className="text-neon-500" size={28} aria-hidden="true" />
                </div>
                <h3 className="font-display text-xl lg:text-2xl font-bold text-warm uppercase mb-3">
                  {value.title}
                </h3>
                <p className="text-warm-400 leading-relaxed">{value.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Why Different Section */}
      <section ref={diffRef} className="section-xl">
        <div className="container-base">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={diffInView ? { opacity: 1, y: 0 } : {}}
              className="inline-block px-4 py-2 rounded-full bg-amazon-orange/20 text-amazon-orange text-sm font-mono mb-4"
            >
              Why Choose Us
            </motion.div>
            
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={diffInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1 }}
              className="font-display text-3xl lg:text-5xl font-black text-warm uppercase tracking-tight mb-4"
            >
              Not Another Agency
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={diffInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 }}
              className="text-warm-400 text-lg max-w-2xl mx-auto"
            >
              We\'re not consultants who learned Amazon from YouTube. We built this after a
              decade in the trenches.
            </motion.p>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={diffInView ? 'visible' : 'hidden'}
            className="space-y-6"
          >
            {differentiators.map((item) => (
              <motion.div
                key={item.title}
                variants={itemVariants}
                whileHover={{ x: 4 }}
                className="flex flex-col lg:flex-row lg:items-center gap-6 p-6 lg:p-8 rounded-3xl bg-warm/5 border border-warm/10 hover:border-neon-500/20 transition-all duration-300"
              >
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-neon-500/10 flex items-center justify-center">
                  <item.icon className="text-neon-500" size={32} aria-hidden="true" />
                </div>
                <div className="flex-grow">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4 mb-2">
                    <p className="text-warm-400 text-sm">{item.title}</p>
                    <ArrowRight size={16} className="text-neon-500 hidden lg:block" aria-hidden="true" />
                    <p className="text-neon-500 font-display text-lg lg:text-xl font-bold uppercase">
                      {item.highlight}
                    </p>
                  </div>
                  <p className="text-warm-400 leading-relaxed">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Guarantee Section */}
      <section className="section-xl bg-gradient-to-b from-jungle-800 to-jungle-900">
        <div ref={guaranteeRef} className="container-base">
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={guaranteeInView ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <div className="relative p-8 lg:p-12 rounded-[2rem] bg-gradient-to-br from-neon-500/10 via-warm/5 to-transparent border border-neon-500/30 overflow-hidden"
            >
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-neon-500/10 rounded-full blur-[80px]" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/20 rounded-full blur-[60px]" />

              <div className="relative z-10 text-center">
                <div className="w-20 h-20 rounded-full bg-neon-500/20 flex items-center justify-center mx-auto mb-8">
                  <Shield className="text-neon-500" size={40} aria-hidden="true" />
                </div>

                <h2 className="font-display text-2xl lg:text-4xl font-black text-warm uppercase tracking-tight mb-6">
                  The 30-Day
                  <br />
                  <span className="text-gradient">"It Works Or You Don\'t Pay"</span>
                  <br />
                  Guarantee
                </h2>

                <div className="max-w-2xl mx-auto mb-8">
                  <p className="text-warm-400 text-lg mb-6">Within 30 days, your AI agent must:</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    {[
                      'Deliver 1+ actionable insight daily',
                      'Save you 5+ hours per week',
                      'Work via Telegram as promised',
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-warm/5">
                        <CheckCircle2 className="text-neon-500 flex-shrink-0" size={18} aria-hidden="true" />
                        <span className="text-warm text-sm">{item}</span>
                      </div>
                    ))}
                  </div>

                  <div className="p-6 rounded-2xl bg-neon-500/10 border border-neon-500/20">
                    <p className="text-warm font-semibold mb-2">If it doesn\'t, we will:</p>
                    <ul className="space-y-2 text-warm-400 text-sm text-left">
                      <li className="flex items-center gap-2">
                        <span className="text-neon-500">✓</span> Refund 100% of your setup fee — no questions
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-neon-500">✓</span> Let you keep the system (it\'s open source, you own it)
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-neon-500">✓</span> Give you a free 1-hour consultation on what went wrong
                      </li>
                    </ul>
                  </div>
                </div>

                <p className="text-warm-400 text-sm italic">
                  "We spent a decade managing Amazon accounts. Now we deliver intelligence that
                  helps you manage them better."
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section ref={ctaRef} className="section-xl">
        <div className="container-base">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={ctaInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <div className="card-elevated p-8 lg:p-16 text-center">
              <div className="w-16 h-16 rounded-full bg-neon-500/20 flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="text-neon-500" size={32} aria-hidden="true" />
              </div>
              
              <h2 className="font-display text-2xl lg:text-4xl font-black text-warm uppercase tracking-tight mb-4">
                Let\'s Build Something Together
              </h2>
              
              <p className="text-warm-400 text-lg mb-8 max-w-md mx-auto">
                Book a free 30-minute call. Tell us about your business. We\'ll tell you exactly
                how we can help — no pitch, no pressure.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <CalendlyButton className="w-full sm:w-auto">
                  Book Free Strategy Call
                </CalendlyButton>
                
                <Link to="/" className="btn-secondary w-full sm:w-auto">
                  Explore Services
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
