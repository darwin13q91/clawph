import { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Play, ArrowDown, Clock, Shield, Zap } from 'lucide-react';
import CalendlyButton from '../components/CalendlyButton';

const painPoints = [
  { icon: Clock, text: 'Spending 10+ hours/week on repetitive tasks' },
  { icon: Zap, text: 'PPC campaigns bleeding money with no ROI' },
  { icon: Shield, text: 'Listings that don\'t convert or rank' },
];

const trustBadges = [
  { label: '30-Day Money-Back Guarantee', color: 'neon' as const },
  { label: 'Amazon TOS Compliant', color: 'amazon' as const },
  { label: 'Secure Checkout', color: 'neon' as const },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  /* A/B Test: Hero Headline — Variant A/B */
  const [variant, setVariant] = useState<'A' | 'B' | null>(null);

  useEffect(() => {
    let assigned = localStorage.getItem('hero_headline_variant') as 'A' | 'B' | null;
    if (!assigned) {
      assigned = Math.random() < 0.5 ? 'A' : 'B';
      localStorage.setItem('hero_headline_variant', assigned);
    }
    setVariant(assigned);

    const headlines = { A: 'Reclaim 10+ Hours Every Week', B: 'Stop Drowning in Amazon Busywork' };
    console.log(`[A/B Test] Hero variant: ${assigned} — "${headlines[assigned]}"`);
  }, []);

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);
  const y = useTransform(scrollYProgress, [0, 0.5], [0, 100]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      aria-label="Hero section"
    >
      {/* Background Layers */}
      <div className="absolute inset-0 z-[-1]">
        {/* Particle background visible through semi-transparent overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-jungle-950/70 via-jungle-900/60 to-jungle-800/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-jungle-800 via-transparent to-transparent" />
      </div>

      {/* Animated Gradient Orbs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-1/4 -right-32 w-96 h-96 bg-neon-500/20 rounded-full blur-[120px]"
      />
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 2,
        }}
        className="absolute -bottom-32 -left-32 w-96 h-96 bg-violet-500/20 rounded-full blur-[120px]"
      />

      {/* Content */}
      <motion.div
        style={{ opacity, scale, y }}
        className="relative z-10 w-full container-base pt-24 sm:pt-32 pb-16 sm:pb-20"
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto text-center"
        >
          {/* Badge */}
          <motion.div variants={itemVariants}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-500/10 border border-neon-500/20 mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-500" />
              </span>
              <span className="text-neon text-sm font-mono">30-Day Money-Back Guarantee — No Questions Asked</span>
            </div>
          </motion.div>

          {/* Headline - More punchy, outcome-focused */}
          <motion.h1
            variants={itemVariants}
            className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-warm uppercase tracking-tight leading-[0.95] mb-6"
          >
            {variant === 'B' ? (
              <>
                Stop Drowning in
                <span className="block text-gradient mt-2">Amazon Busywork</span>
              </>
            ) : (
              <>
                Reclaim
                <span className="block text-gradient mt-2">10+ Hours Every Week</span>
              </>
            )}
          </motion.h1>

          {/* Subheadline - Clearer value prop */}
          <motion.p
            variants={itemVariants}
            className="text-warm-400 text-lg sm:text-xl max-w-2xl mx-auto mb-8 leading-relaxed"
          >
            AI-powered River agent handles the busywork — you focus on scaling
            <span className="block text-warm-300 text-base mt-2">
              Built by an Amazon seller who got tired of the grind
            </span>
          </motion.p>

          {/* Pain Points */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-8 px-2 sm:px-0"
          >
            {painPoints.map((point, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.1, duration: 0.5 }}
                className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full bg-warm/5 border border-warm/10 text-warm-400 text-[11px] sm:text-xs"
              >
                <point.icon size={12} className="text-neon flex-shrink-0" aria-hidden="true" />
                <span className="text-left whitespace-nowrap">{point.text}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* CTAs - More compelling with social proof */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10"
          >
            <motion.div
              whileHover={{ scale: 1.03, boxShadow: "0 0 40px rgba(207, 255, 0, 0.3)" }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <CalendlyButton size="lg">
                Book Free 30-Min Strategy Call →
              </CalendlyButton>
            </motion.div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => scrollToSection('demo')}
              className="btn-secondary flex items-center gap-2 group"
            >
              <Play size={18} className="group-hover:scale-110 transition-transform" aria-hidden="true" />
              <span>See It In Action</span>
            </motion.button>
          </motion.div>
          
          {/* Quick Social Proof Stats */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap items-center justify-center gap-6 text-warm-400 text-xs"
          >
            <span className="flex items-center gap-1.5">
              <span className="text-neon font-bold">✓</span> Free audit included
            </span>
            <span className="hidden sm:inline text-warm-200/30">|</span>
            <span className="flex items-center gap-1.5">
              <span className="text-neon font-bold">✓</span> No credit card required
            </span>
            <span className="hidden sm:inline text-warm-200/30">|</span>
            <span className="flex items-center gap-1.5">
              <span className="text-neon font-bold">✓</span> Reply within 1 hour
            </span>
          </motion.div>

          {/* Trust Badges - Enhanced with hover effects */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap items-center justify-center gap-2 sm:gap-6 px-2"
          >
            {trustBadges.map((badge, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.05, y: -2 }}
                className="flex items-center gap-1.5 sm:gap-2 cursor-default"
              >
                <div
                  className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0 ${
                    badge.color === 'neon' ? 'bg-neon-500' : 'bg-amazon-orange'
                  }`}
                  aria-hidden="true"
                />
                <span className="text-warm text-[10px] sm:text-xs font-medium whitespace-nowrap">{badge.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden lg:flex flex-col items-center gap-2 text-warm-400"
        >
          <span className="text-xs uppercase tracking-widest">Scroll</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ArrowDown size={20} aria-hidden="true" />
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
