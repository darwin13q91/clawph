import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { MessageSquare, Wrench, Rocket, Headphones } from 'lucide-react';

interface Step {
  number: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
}

const steps: Step[] = [
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
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

export default function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section
      ref={sectionRef}
      id="process"
      className="relative z-10 bg-jungle-800/80 backdrop-blur-sm section-lg overflow-hidden"
    >
      {/* Background Decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-warm/5 to-transparent" />
        <div className="absolute top-0 right-1/4 w-px h-full bg-gradient-to-b from-transparent via-warm/5 to-transparent" />
      </div>

      <div className="container-base relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16 sm:mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-500/10 border border-neon-500/20 mb-6">
            <span className="text-neon text-sm font-mono font-medium">How It Works</span>
          </div>
          
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-warm uppercase tracking-tight leading-[1.1] mb-5">
            From Call to Live
            <span className="block text-gradient mt-2">in Under a Week</span>
          </h2>
          
          <p className="text-warm-400 text-base sm:text-lg max-w-xl mx-auto">
            No long onboarding. No confusing contracts. Just results.
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="max-w-3xl mx-auto space-y-4"
        >
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              variants={itemVariants}
              className="group relative"
            >
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="absolute left-6 sm:left-8 top-16 sm:top-20 w-px h-[calc(100%+1rem)] bg-gradient-to-b from-neon-500/30 to-transparent hidden sm:block" />
              )}

              <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-warm/5 border border-warm/10 hover:border-neon-500/30 hover:bg-warm/[0.07] transition-all duration-300">
                {/* Number & Icon */}
                <div className="flex items-center gap-3 sm:gap-4 sm:w-48 flex-shrink-0">
                  <span className="font-mono text-2xl sm:text-3xl font-bold text-neon-500/40 group-hover:text-neon-500/60 transition-colors">
                    {step.number}
                  </span>
                  <div className="w-12 h-12 rounded-xl bg-neon-500/10 border border-neon-500/20 flex items-center justify-center group-hover:bg-neon-500/20 transition-colors">
                    <step.icon className="text-neon-500" size={24} aria-hidden="true" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 pt-1">
                  <h3 className="font-display text-lg sm:text-xl font-bold text-warm uppercase mb-2">
                    {step.title}
                  </h3>
                  <p className="text-warm-400 leading-relaxed text-sm sm:text-base">
                    {step.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 sm:mt-16 text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-warm/5 border border-warm/10">
            <div className="w-2 h-2 rounded-full bg-neon-500 animate-pulse" aria-hidden="true" />
            <span className="text-warm-400 text-sm">
              Average setup time: <span className="text-warm font-medium">48 hours</span> for AI agents
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
