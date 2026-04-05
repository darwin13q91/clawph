/**
 * HowItWorksSection — 3-step "How it works" section.
 * Positioned before pricing to build trust and understanding.
 */
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Bot, MessageCircle, Zap } from 'lucide-react';

const steps = [
  {
    number: '01',
    title: 'Book your call',
    description:
      'Pick a plan that fits your needs. We\'ll assess your workflow and recommend the right setup — even if neither plan is perfect.',
    icon: Zap,
    accent: 'neon',
  },
  {
    number: '02',
    title: 'We set everything up',
    description:
      'Telegram, Discord, or WhatsApp — your AI assistant goes live in 48 hours. You message it like a colleague; it handles the work.',
    icon: Bot,
    accent: 'violet',
  },
  {
    number: '03',
    title: 'It works while you sleep',
    description:
      'From lead follow-ups to ops automation, your AI handles the repetitive work. You scale without hiring.',
    icon: MessageCircle,
    accent: 'neon',
  },
];

export default function HowItWorksSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="how-it-works" className="py-20 lg:py-28" ref={ref}>
      <div className="container-base">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <p className="text-neon-500 text-sm font-mono font-semibold tracking-widest uppercase mb-3">
            Simple process
          </p>
          <h2 className="font-display text-3xl lg:text-5xl font-black text-warm tracking-tight leading-tight">
            Up and running in 48 hours
          </h2>
          <p className="text-warm-400 text-lg mt-4 max-w-xl mx-auto">
            No technical skills needed. We handle the setup — you get the AI assistant.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-4xl mx-auto">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const isNeon = step.accent === 'neon';
            const accentColor = isNeon ? 'text-neon-500' : 'text-violet-400';
            const borderColor = isNeon
              ? 'border-neon-500/20 hover:border-neon-500/40'
              : 'border-violet-500/20 hover:border-violet-500/40';
            const bgColor = isNeon ? 'bg-neon-500/5' : 'bg-violet-500/5';
            const glowColor = isNeon
              ? 'shadow-[0_0_30px_rgba(207,255,0,0.08)]'
              : 'shadow-[0_0_30px_rgba(176,108,219,0.08)]';

            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                whileHover={{ y: -4 }}
                className={`relative rounded-2xl border ${borderColor} ${bgColor} p-7 transition-all duration-300 ${glowColor}`}
              >
                {/* Step number */}
                <span className={`font-mono text-xs font-bold tracking-widest ${accentColor} opacity-60 mb-4 block`}>
                  {step.number}
                </span>

                {/* Icon */}
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${
                    isNeon ? 'bg-neon-500/10' : 'bg-violet-500/10'
                  }`}
                >
                  <Icon size={24} className={accentColor} />
                </div>

                {/* Content */}
                <h3 className="font-display text-xl font-black text-warm mb-2">
                  {step.title}
                </h3>
                <p className="text-warm-400 text-sm leading-relaxed">{step.description}</p>

                {/* Connector arrow (not on last) */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute -right-5 top-1/2 -translate-y-1/2 z-10">
                    <div className={`w-10 h-0.5 bg-gradient-to-r ${isNeon ? 'from-neon-500/40 to-transparent' : 'from-violet-500/40 to-transparent'}`} />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
