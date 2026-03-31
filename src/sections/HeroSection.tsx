import { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { Play, ArrowDown, Clock, Shield, Zap } from 'lucide-react';
import CalendlyButton from '../components/CalendlyButton';

const painPoints = [
  { icon: Clock, text: 'Spending 10+ hours/week on repetitive tasks' },
  { icon: Zap, text: 'PPC campaigns bleeding money with no ROI' },
  { icon: Shield, text: 'Listings that don\'t convert or rank' },
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
    // A/B test variant assigned silently — no console.log for production cleanliness
  }, []);

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);
  const y = useTransform(scrollYProgress, [0, 0.5], [0, 100]);

  const prefersReducedMotion = useReducedMotion();

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
        {/* Hero image — hidden for prefersReducedMotion users */}
        {!prefersReducedMotion && (
          <img
            src="/amajungle-from-chaos-to-calm.jpg"
            alt=""
            aria-hidden="true"
            loading="eager"
            className="absolute inset-0 w-full h-full object-cover object-center z-[-1]"
          />
        )}
        {/* Dark gradient overlay ensures 4.5:1 contrast ratio over image */}
        <div className="absolute inset-0 bg-gradient-to-br from-jungle-950/70 via-jungle-900/60 to-jungle-800/50 z-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-jungle-800 via-transparent to-transparent z-0" />
      </div>

      {/* Animated Gradient Orbs — hidden for users who prefer reduced motion */}
      {!prefersReducedMotion && (
        <>
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
        </>
      )}

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
          {/* Badge - Removed to reduce visual clutter competing with CTA */}

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

          {/* Pain Points - Reduced to 3 max, visually subordinate to CTA */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap items-center justify-center gap-3 mb-10 px-2 sm:px-0"
          >
            {painPoints.slice(0, 3).map((point, i) => (
              <div
                key={i}
                className="text-warm/50 text-xs"
              >
                <span className="text-neon/60">•</span> {point.text.replace(/^(Spending| PPC| Listings)/, '')}
              </div>
            ))}
          </motion.div>

          {/* CTAs - Hero CTA with dominant glow effect */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8"
          >
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="relative"
            >
              {/* Glow ring behind button */}
              <div className="absolute -inset-2 bg-neon-500/20 rounded-full blur-xl" aria-hidden="true" />
              <div className="absolute -inset-1 bg-neon-500/10 rounded-full blur-2xl" aria-hidden="true" />
              <CalendlyButton size="lg" className="relative z-10 shadow-[0_0_30px_rgba(207,255,0,0.4)]">
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

            {/* Meet River - Secondary CTA */}
            <motion.a
              href="#pricing"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('pricing');
              }}
              whileHover={{ scale: 1.02 }}
              className="text-neon/70 hover:text-neon text-sm font-medium flex items-center gap-1.5 transition-colors group"
            >
              <span>Meet River AI →</span>
            </motion.a>
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

          {/* Trust Badges - Minimal, subordinate to CTA */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap items-center justify-center gap-4 text-warm/40 text-[10px] sm:text-xs"
          >
            <span>✓ 30-Day Money-Back</span>
            <span className="hidden sm:inline">•</span>
            <span>✓ Amazon TOS Compliant</span>
            <span className="hidden sm:inline">•</span>
            <span>✓ Reply in 1 Hour</span>
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
