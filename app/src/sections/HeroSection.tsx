import { useEffect, useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Play } from 'lucide-react';
import CalendlyButton from '../components/CalendlyButton';

gsap.registerPlugin(ScrollTrigger);

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const painPointsRef = useRef<HTMLDivElement>(null);
  const solutionRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  // Auto-play entrance animation on load
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.fromTo(
        bgRef.current,
        { opacity: 0, scale: 1.06 },
        { opacity: 1, scale: 1, duration: 0.8 },
        0
      );

      tl.fromTo(
        headlineRef.current,
        { y: '4vh', opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6 },
        0.2
      );

      tl.fromTo(
        painPointsRef.current,
        { y: '3vh', opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5 },
        0.4
      );

      tl.fromTo(
        solutionRef.current,
        { y: '3vh', opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5 },
        0.55
      );

      tl.fromTo(
        ctaRef.current,
        { y: '2vh', opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45 },
        0.7
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
    '❌ Missing opportunities while you sleep',
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
        style={{ opacity: 0 }}
      >
        <img
          src="/images/hero_leaf_bg.jpg"
          alt="Tropical leaf background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-jungle/90 via-jungle/80 to-jungle/70" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full h-full flex items-center">
        <div className="w-full px-6 lg:px-[7vw]">
          <div className="max-w-3xl mx-auto text-center">
            {/* 3D Logo */}
            <div className="mb-8">
              <img 
                src="/images/logo-3d-glass.png" 
                alt="amajungle" 
                className="h-24 lg:h-32 w-auto mx-auto animate-floating"
              />
            </div>

            {/* Amazon Badge - Orange accent */}
            <div className="amazon-badge inline-flex items-center gap-2 mb-4">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              <span>Amazon FBA Specialist</span>
            </div>

            {/* Founding Pricing Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon/10 border border-neon/20 mb-8">
              <span className="w-2 h-2 rounded-full bg-neon animate-pulse" />
              <span className="text-neon text-sm font-mono">
                First 10 clients — 50% off founding pricing
              </span>
            </div>

            {/* Headline - PAIN FOCUSED */}
            <h1
              ref={headlineRef}
              className="font-display text-[clamp(36px,5vw,72px)] font-black text-warm uppercase tracking-tight leading-[0.95] mb-6"
              style={{ opacity: 0 }}
            >
              Stop Drowning in<br />
              <span className="text-neon">Amazon Busywork</span>
            </h1>

            {/* Pain Points */}
            <div
              ref={painPointsRef}
              className="space-y-3 mb-8"
              style={{ opacity: 0 }}
            >
              {painPoints.map((point, i) => (
                <p key={i} className="text-warm-72 text-base lg:text-lg">
                  {point}
                </p>
              ))}
            </div>

            {/* Solution Statement */}
            <div
              ref={solutionRef}
              className="mb-10"
              style={{ opacity: 0 }}
            >
              <p className="text-warm text-xl lg:text-2xl font-medium mb-2">
                AI automation • Amazon management • Brand websites
              </p>
              <p className="text-warm-72 text-base">
                Everything you need to grow — from a founder who's been there
              </p>
            </div>

            {/* CTAs */}
            <div
              ref={ctaRef}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
              style={{ opacity: 0 }}
            >
              <CalendlyButton className="w-full sm:w-auto justify-center">
                Book Free 30-Min Audit
              </CalendlyButton>
              <button
                onClick={() => scrollToSection('audit')}
                className="btn-secondary w-full sm:w-auto flex items-center justify-center gap-2"
              >
                <Play size={18} />
                See How It Works
              </button>
            </div>

            {/* Trust Signals */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-8 text-sm">
              <span className="text-amazon font-medium">● Amazon FBA Expert</span>
              <span className="text-warm/30">|</span>
              <span className="text-neon">● 30-Day Guarantee</span>
              <span className="text-warm/30">|</span>
              <span className="text-warm-72">● No Contracts</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
