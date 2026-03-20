import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MessageSquare, Wrench, Rocket, Headphones } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    number: '01',
    icon: MessageSquare,
    title: 'Book a Free Call',
    description: '15-minute discovery call. We learn your pain points and goals. No pitch, just listening.',
  },
  {
    number: '02',
    icon: Wrench,
    title: 'We Build Your Solution',
    description: 'AI agent or Amazon strategy — built specifically for your workflow. 48-hour to 7-day delivery.',
  },
  {
    number: '03',
    icon: Rocket,
    title: 'Launch & Handoff',
    description: 'Full training session. You control everything. We stay available for 30 days of support.',
  },
  {
    number: '04',
    icon: Headphones,
    title: 'Ongoing Support',
    description: 'Monthly check-ins, optimizations, and new insights as your business grows.',
  },
];

export default function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<(HTMLDivElement | null)[]>([]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        headerRef.current,
        { y: '4vh', opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          scrollTrigger: {
            trigger: headerRef.current,
            start: 'top 80%',
            end: 'top 60%',
            scrub: 0.5,
          },
        }
      );

      stepsRef.current.forEach((step, index) => {
        if (step) {
          gsap.fromTo(
            step,
            { x: index % 2 === 0 ? '-5vw' : '5vw', opacity: 0 },
            {
              x: 0,
              opacity: 1,
              duration: 0.6,
              delay: index * 0.1, // Stagger: 0.1s delay per step
              scrollTrigger: {
                trigger: step,
                start: 'top 85%',
                end: 'top 60%',
                scrub: 0.5,
              },
            }
          );
        }
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="process"
      className="relative z-60 bg-jungle py-24 lg:py-32"
    >
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div ref={headerRef} className="text-center mb-12 sm:mb-16 px-4">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon/10 border border-neon/20 text-neon text-sm font-mono font-medium mb-6">
            How It Works
          </span>
          <h2 className="font-display text-[clamp(2rem,4vw,3.5rem)] font-black text-warm uppercase tracking-tight leading-[1.1] mb-5">
            From Call to Live<br />in Under a Week
          </h2>
          <p className="text-warm-72 text-base sm:text-lg max-w-xl mx-auto">
            No long onboarding. No confusing contracts. Just results.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-4 sm:space-y-6">
          {steps.map((step, index) => (
            <div
              key={step.number}
              ref={(el) => { stepsRef.current[index] = el; }}
              className="flex flex-col sm:flex-row items-start gap-5 sm:gap-6 p-5 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl bg-warm/5 border border-warm/10 hover:border-neon/30 hover:bg-warm/[0.07] transition-all duration-300 group"
            >
              {/* Number & Icon */}
              <div className="flex items-center gap-3 sm:gap-4 sm:w-48 flex-shrink-0">
                <span className="font-mono text-2xl sm:text-3xl font-bold text-neon/40 group-hover:text-neon/60 transition-colors">
                  {step.number}
                </span>
                <div className="w-11 h-11 rounded-full bg-neon/10 border border-neon/20 flex items-center justify-center group-hover:bg-neon/20 transition-colors">
                  <step.icon className="text-neon" size={20} />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1">
                <h3 className="font-display text-lg sm:text-xl font-bold text-warm uppercase mb-2">
                  {step.title}
                </h3>
                <p className="text-warm/70 leading-relaxed text-sm sm:text-base">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
