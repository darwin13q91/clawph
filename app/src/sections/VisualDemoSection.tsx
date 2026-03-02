import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MessageSquare, TrendingUp, Clock, Shield } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const benefits = [
  { icon: Clock, value: '10+', label: 'Hours Saved Weekly' },
  { icon: MessageSquare, value: '24/7', label: 'AI Monitoring' },
  { icon: TrendingUp, value: '35%', label: 'Avg. Efficiency Gain' },
  { icon: Shield, value: '100%', label: 'You Own Everything' },
];

export default function VisualDemoSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const beforeAfterRef = useRef<HTMLDivElement>(null);
  const telegramRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

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

      gsap.fromTo(
        beforeAfterRef.current,
        { x: '-5vw', opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.6,
          scrollTrigger: {
            trigger: beforeAfterRef.current,
            start: 'top 80%',
            end: 'top 55%',
            scrub: 0.5,
          },
        }
      );

      gsap.fromTo(
        telegramRef.current,
        { x: '5vw', opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.6,
          scrollTrigger: {
            trigger: telegramRef.current,
            start: 'top 80%',
            end: 'top 55%',
            scrub: 0.5,
          },
        }
      );

      gsap.fromTo(
        statsRef.current,
        { y: '4vh', opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          scrollTrigger: {
            trigger: statsRef.current,
            start: 'top 85%',
            end: 'top 65%',
            scrub: 0.5,
          },
        }
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="demo"
      className="relative z-60 bg-jungle py-24 lg:py-32 overflow-hidden"
    >
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-neon/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {/* Header */}
        <div ref={headerRef} className="text-center mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-neon/10 text-neon text-sm font-mono mb-4">
            See It In Action
          </span>
          <h2 className="font-display text-[clamp(32px,4vw,56px)] font-black text-warm uppercase tracking-tight mb-4">
            From Chaos to <span className="text-neon">Calm</span>
          </h2>
          <p className="text-warm-72 text-lg max-w-2xl mx-auto">
            See how our AI agents transform your daily workflow from overwhelming manual tasks to effortless automation.
          </p>
        </div>

        {/* Before/After Image */}
        <div ref={beforeAfterRef} className="mb-16">
          <div className="relative rounded-3xl overflow-hidden border border-warm/10 shadow-2xl">
            <img
              src="/images/before-after.png"
              alt="Before and after comparison showing the transformation from manual work to AI automation"
              className="w-full h-auto"
            />
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-jungle/50 to-transparent pointer-events-none" />
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-16">
          {/* Telegram Mockup */}
          <div ref={telegramRef} className="card-jungle card-hover p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-neon/20 flex items-center justify-center">
                <MessageSquare className="text-neon" size={20} />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-warm uppercase">
                  Control Via Telegram
                </h3>
                <p className="text-warm-72 text-sm">Text your AI like an assistant</p>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden border border-warm/10">
              <img
                src="/images/telegram-mockup.png"
                alt="Telegram bot interface showing inventory alerts, PPC reports, and pricing updates"
                className="w-full h-auto"
              />
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="card-jungle card-hover p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-amazon/20 flex items-center justify-center">
                <TrendingUp className="text-amazon" size={20} />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-warm uppercase">
                  Real-Time Analytics
                </h3>
                <p className="text-warm-72 text-sm">Track performance at a glance</p>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden border border-warm/10">
              <img
                src="/images/dashboard-mockup.png"
                alt="Dashboard showing sales growth, PPC performance, inventory levels, and conversion rates"
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div ref={statsRef} className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {benefits.map((benefit) => (
            <div
              key={benefit.label}
              className="card-jungle p-6 text-center card-hover"
            >
              <div className="w-12 h-12 rounded-full bg-neon/10 flex items-center justify-center mx-auto mb-4">
                <benefit.icon className="text-neon" size={24} />
              </div>
              <div className="font-mono text-3xl lg:text-4xl font-bold text-neon mb-2">
                {benefit.value}
              </div>
              <div className="text-warm-72 text-sm">{benefit.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
