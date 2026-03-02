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
    description: 'Monthly check-ins, optimizations, and new automations as your business grows.',
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
        <div ref={headerRef} className="text-center mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-neon/10 text-neon text-sm font-mono mb-4">
            How It Works
          </span>
          <h2 className="font-display text-[clamp(36px,4vw,64px)] font-black text-warm uppercase tracking-tight mb-4">
            From Call to Live<br />in Under a Week
          </h2>
          <p className="text-warm-72 text-lg max-w-xl mx-auto">
            No long onboarding. No confusing contracts. Just results.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-8">
          {steps.map((step, index) => (
            <div
              key={step.number}
              ref={(el) => { stepsRef.current[index] = el; }}
              className="flex flex-col sm:flex-row items-start gap-6 p-6 lg:p-8 rounded-3xl bg-warm/5 border border-warm/10 hover:border-neon/30 transition-colors"
            >
              {/* Number & Icon */}
              <div className="flex items-center gap-4 sm:w-48 flex-shrink-0">
                <span className="font-mono text-3xl font-bold text-neon/50">
                  {step.number}
                </span>
                <div className="w-12 h-12 rounded-full bg-neon/20 flex items-center justify-center">
                  <step.icon className="text-neon" size={22} />
                </div>
              </div>

              {/* Content */}
              <div>
                <h3 className="font-display text-xl font-bold text-warm uppercase mb-2">
                  {step.title}
                </h3>
                <p className="text-warm-72 leading-relaxed">
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
