import { useEffect, useRef, useLayoutEffect } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Play } from 'lucide-react';
import CalendlyButton from '../components/CalendlyButton';
import { GradientPulse } from '../components/BackgroundEffects';

gsap.registerPlugin(ScrollTrigger);

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const painPointsRef = useRef<HTMLDivElement>(null);
  const solutionRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  // Auto-play entrance animation on load - Standardized 0.6s duration with 0.1s stagger
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.6 } });

      tl.fromTo(
        bgRef.current,
        { opacity: 0, scale: 1.06 },
        { opacity: 1, scale: 1 },
        0
      );

      tl.fromTo(
        headlineRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1 },
        0.1
      );

      tl.fromTo(
        painPointsRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1 },
        0.2
      );

      tl.fromTo(
        solutionRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1 },
        0.3
      );

      tl.fromTo(
        ctaRef.current,
        { y: 15, opacity: 0 },
        { y: 0, opacity: 1 },
        0.4
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
            gsap.set([headlineRef.current, painPointsRef.current, solutionRef.current, ctaRef.current], {
              x: 0, y: 0, opacity: 1
            });
          }
        },
      });

      scrollTl.fromTo(
        headlineRef.current,
        { y: 0, opacity: 1 },
        { y: '-10vh', opacity: 0, ease: 'power2.in' },
        0.70
      );

      scrollTl.fromTo(
        painPointsRef.current,
        { y: 0, opacity: 1 },
        { y: '-8vh', opacity: 0, ease: 'power2.in' },
        0.72
      );

      scrollTl.fromTo(
        solutionRef.current,
        { y: 0, opacity: 1 },
        { y: '-6vh', opacity: 0, ease: 'power2.in' },
        0.74
      );

      scrollTl.fromTo(
        ctaRef.current,
        { y: 0, opacity: 1 },
        { y: '-4vh', opacity: 0, ease: 'power2.in' },
        0.76
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

  const painPoints = [
    '❌ Spending 10+ hours/week on repetitive Amazon tasks',
    '❌ PPC campaigns bleeding money with no ROI',
    '❌ Listings that don\'t convert or rank',
    '❌ Missing opportunities you don\'t have bandwidth to catch',
  ];

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="section-pinned z-10"
    >
      {/* Background Image */}
      <div
        ref={bgRef}
        className="absolute inset-0 w-full h-full"
      >
        <img
          src="/images/hero_leaf_bg.jpg"
          alt="Tropical leaf background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-jungle/90 via-jungle/80 to-jungle/70" />
        
        {/* Ambient Gradient Pulse Effect */}
        <GradientPulse />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full h-full flex items-center">
        <div className="w-full px-6 lg:px-[7vw]">
          <div className="max-w-3xl mx-auto text-center">
            {/* 3D Logo - Enhanced floating with glow */}
            <div className="mb-8 relative">
              <div className="absolute inset-0 blur-3xl bg-neon/20 rounded-full animate-pulse-glow" />
              <img 
                src="/images/logo-3d-glass.png" 
                alt="amajungle" 
                className="h-24 lg:h-32 w-auto mx-auto animate-floating relative z-10 drop-shadow-[0_0_30px_rgba(207,255,0,0.3)]"
              />
            </div>

            {/* Amazon Badge - Orange accent with hover lift */}
            <div className="amazon-badge inline-flex items-center gap-2 mb-4 hover:scale-105 hover:shadow-lg transition-all duration-300 cursor-default">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              <span>Amazon FBA Specialist</span>
            </div>

            {/* Founding Pricing Badge with hover effect */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon/10 border border-neon/20 mb-8 hover:bg-neon/20 hover:border-neon/40 hover:scale-[1.02] transition-all duration-300 cursor-default">
              <span className="w-2 h-2 rounded-full bg-neon animate-pulse" />
              <span className="text-neon text-sm font-mono">
                First 10 clients — 50% off founding pricing
              </span>
            </div>

            {/* Headline - PAIN FOCUSED */}
            <h1
              ref={headlineRef}
              className="font-display text-[clamp(36px,5vw,72px)] font-black text-warm uppercase tracking-tight leading-[0.95] mb-6"
            >
              Stop Drowning in<br />
              <span className="text-neon">Amazon Busywork</span>
            </h1>

            {/* Pain Points with staggered hover effects */}
            <div
              ref={painPointsRef}
              className="space-y-3 mb-8"
            >
              {painPoints.map((point, i) => (
                <p 
                  key={i} 
                  className="text-warm-72 text-base lg:text-lg hover:text-warm hover:translate-x-1 transition-all duration-300 cursor-default"
                  style={{ transitionDelay: `${i * 50}ms` }}
                >
                  {point}
                </p>
              ))}
            </div>

            {/* Solution Statement */}
            <div
              ref={solutionRef}
              className="mb-10"
            >
              <p className="text-warm text-xl lg:text-2xl font-medium mb-2">
                River-powered intelligence • Amazon management • Brand websites
              </p>
              <p className="text-neon text-sm font-mono mb-2">
                Powered by River, our 23-mode analysis engine
              </p>
              <p className="text-warm-72 text-base">
                Everything you need to grow — from a founder who's been there
              </p>
            </div>

            {/* Enhanced Trust Signals Bar with card hover */}
            <div className="mt-8 mb-6 p-4 rounded-xl bg-warm/5 border border-warm/10 backdrop-blur-sm hover:bg-warm/10 hover:border-warm/20 hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
                <div className="flex items-center gap-2 group cursor-default">
                  <svg className="w-5 h-5 text-neon group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-warm font-medium">30-Day Money-Back Guarantee</span>
                </div>
                <div className="flex items-center gap-2 group cursor-default">
                  <svg className="w-5 h-5 text-amazon group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                  <span className="text-warm font-medium">Trusted by Amazon Sellers</span>
                </div>
                <div className="flex items-center gap-2 group cursor-default">
                  <svg className="w-5 h-5 text-neon group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-warm font-medium">Secure Checkout</span>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div
              ref={ctaRef}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <CalendlyButton className="w-full sm:w-auto justify-center">
                Book Free 30-Min Audit
              </CalendlyButton>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => scrollToSection('process')}
                className="btn-secondary w-full sm:w-auto flex items-center justify-center gap-2"
              >
                <Play size={18} />
                See How It Works
              </motion.button>
            </div>

            {/* Secondary Trust Signals */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-sm">
              <span className="text-amazon font-medium">● Amazon FBA Expert</span>
              <span className="text-warm/30">|</span>
              <span className="text-neon">● 30-Day Guarantee</span>
              <span className="text-warm/30">|</span>
              <span className="text-warm-72">● No Contracts</span>
            </div>

            {/* River Badge with hover effect */}
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warm/5 border border-warm/10 hover:bg-warm/10 hover:border-warm/20 hover:scale-[1.02] transition-all duration-300 cursor-default group">
              <span className="text-lg group-hover:scale-110 transition-transform duration-300">🌊</span>
              <span className="text-warm-72 text-sm">Powered by River AI — 23 specialized Amazon intelligence modes</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
