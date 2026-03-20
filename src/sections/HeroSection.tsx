import { useEffect, useRef, useLayoutEffect } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Play, ArrowDown, Shield, Clock, Zap } from 'lucide-react';
import CalendlyButton from '../components/CalendlyButton';
import { GradientPulse } from '../components/BackgroundEffects';

gsap.registerPlugin(ScrollTrigger);

const painPoints = [
  { icon: Clock, text: 'Spending 10+ hours/week on repetitive Amazon tasks' },
  { icon: Zap, text: 'PPC campaigns bleeding money with no ROI' },
  { icon: Shield, text: 'Listings that don\'t convert or rank' },
];

const trustBadges = [
  { label: '30-Day Guarantee', color: 'neon' },
  { label: 'Trusted by Sellers', color: 'amazon' },
  { label: 'Secure Checkout', color: 'neon' },
];

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  // Entrance animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ 
        defaults: { ease: 'power3.out' },
        delay: 0.3
      });

      tl.fromTo(
        bgRef.current,
        { opacity: 0, scale: 1.1 },
        { opacity: 1, scale: 1, duration: 1.2 }
      );

      tl.fromTo(
        '.hero-badge',
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6 },
        '-=0.8'
      );

      tl.fromTo(
        headlineRef.current,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8 },
        '-=0.5'
      );

      tl.fromTo(
        '.hero-subheadline',
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6 },
        '-=0.4'
      );

      tl.fromTo(
        '.hero-pain-point',
        { x: -20, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5, stagger: 0.1 },
        '-=0.3'
      );

      tl.fromTo(
        '.hero-cta',
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6 },
        '-=0.2'
      );

      tl.fromTo(
        '.hero-trust',
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5 },
        '-=0.3'
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  // Scroll-driven exit animation
  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=130%',
          pin: true,
          scrub: 0.6,
          onLeaveBack: () => {
            gsap.set([headlineRef.current, contentRef.current], {
              opacity: 1, y: 0, x: 0
            });
          }
        },
      });

      scrollTl.to(
        headlineRef.current,
        { y: '-15vh', opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.to(
        '.hero-content',
        { y: '-10vh', opacity: 0, ease: 'power2.in' },
        0.72
      );
    }, section);

    return () => ctx.revert();
  }, []);

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
      className="section-pinned z-10"
    >
      {/* Background */}
      <div
        ref={bgRef}
        className="absolute inset-0 w-full h-full"
      >
        <img
          src="/images/hero_leaf_bg.jpg"
          alt=""
          className="w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-jungle/95 via-jungle/85 to-jungle/75" />
        <div className="absolute inset-0 bg-gradient-to-t from-jungle via-transparent to-transparent" />
        <GradientPulse />
      </div>

      {/* Content */}
      <div 
        ref={contentRef}
        className="relative z-10 w-full h-full flex items-center"
      >
        <div className="w-full px-4 sm:px-6 lg:px-12 xl:px-20">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <motion.div 
              className="hero-badge inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-lime/10 border border-neon-lime/20 mb-6 sm:mb-8"
            >
              <span className="w-2 h-2 rounded-full bg-neon-lime animate-pulse" />
              <span className="text-neon text-sm font-mono">First 10 clients — 50% off founding pricing</span>
            </motion.div>

            {/* Headline */}
            <h1
              ref={headlineRef}
              className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-warm uppercase tracking-tight leading-[0.95] mb-6"
            >
              Stop Drowning in
              <span className="block text-neon mt-2">Amazon Busywork</span>
            </h1>

            {/* Subheadline */}
            <p className="hero-subheadline text-warm-72 text-lg sm:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
              River-powered intelligence • Amazon management • Brand websites
              <span className="block text-warm-50 text-base mt-2">
                Everything you need to grow — from a founder who's been there
              </span>
            </p>

            {/* Pain Points */}
            <div className="hero-content flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-8 px-2 sm:px-0">
              {painPoints.map((point, i) => (
                <div
                  key={i}
                  className="hero-pain-point flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-warm/5 border border-warm/10 text-warm-72 text-xs sm:text-sm"
                >
                  <point.icon size={14} className="text-neon flex-shrink-0" />
                  <span className="text-left">{point.text}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="hero-cta flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <CalendlyButton size="lg">
                Book Free 30-Min Audit
              </CalendlyButton>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => scrollToSection('process')}
                className="btn-secondary flex items-center gap-2"
              >
                <Play size={18} />
                See How It Works
              </motion.button>
            </div>

            {/* Trust Badges */}
            <div className="hero-trust flex flex-wrap items-center justify-center gap-3 sm:gap-6 px-4">
              {trustBadges.map((badge, i) => (
                <div key={i} className="flex items-center gap-1.5 sm:gap-2">
                  <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0 ${
                    badge.color === 'neon' ? 'bg-neon' : 'bg-amazon'
                  }`} />
                  <span className="text-warm text-xs sm:text-sm font-medium">{badge.label}</span>
                </div>
              ))}
            </div>

            {/* Scroll Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden lg:flex flex-col items-center gap-2 text-warm-50"
            >
              <span className="text-xs uppercase tracking-widest">Scroll</span>
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <ArrowDown size={20} />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}