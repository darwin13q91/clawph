/**
 * UseCasesSection — "Who is this for?" section.
 * Describes the ideal customer profiles before pricing.
 */
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Store, Camera, TrendingUp, Settings } from 'lucide-react';

const useCases = [
  {
    icon: Store,
    title: 'Local business owner',
    description:
      'Running a retail shop, restaurant, or service business in the Philippines. You\'re juggling ops, customer messages, and inventory — and you need an assistant that handles the repetitive stuff so you can focus on growth.',
    accentColor: 'neon',
  },
  {
    icon: Camera,
    title: 'Creator or freelancer',
    description:
      'Managing your own brand, client communications, and content pipeline. You want a smart assistant that drafts replies, summarises messages, and keeps your workflow moving without you being online 24/7.',
    accentColor: 'violet',
  },
  {
    icon: TrendingUp,
    title: 'Sales or BD professional',
    description:
      'Tired of losing hot leads because you couldn\'t follow up fast enough. ClawPH handles initial responses, qualifies prospects, and reminds you when it\'s time to close — keeping your pipeline warm at all hours.',
    accentColor: 'neon',
  },
  {
    icon: Settings,
    title: 'Ops-heavy founder',
    description:
      'You\'re managing a small team and wearing every hat. OpenClaw becomes your ops layer — automating approvals, summarising standups, drafting SOPs, and handling the admin that burns you out.',
    accentColor: 'violet',
  },
];

export default function UseCasesSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="use-cases" className="py-20 lg:py-28 bg-jungle-900/30" ref={ref}>
      <div className="container-base">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <p className="text-neon-500 text-sm font-mono font-semibold tracking-widest uppercase mb-3">
            Who it&apos;s for
          </p>
          <h2 className="font-display text-3xl lg:text-5xl font-black text-warm tracking-tight leading-tight">
            Built for Philippine businesses
          </h2>
          <p className="text-warm-400 text-lg mt-4 max-w-xl mx-auto">
            Not a generic AI tool. ClawPH is configured for how Filipino businesses actually work.
          </p>
        </motion.div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {useCases.map((useCase, i) => {
            const isNeon = useCase.accentColor === 'neon';
            const borderColor = isNeon
              ? 'border-neon-500/15 hover:border-neon-500/35'
              : 'border-violet-500/15 hover:border-violet-500/35';
            const iconBg = isNeon ? 'bg-neon-500/10' : 'bg-violet-500/10';
            const iconColor = isNeon ? 'text-neon-500' : 'text-violet-400';

            return (
              <motion.div
                key={useCase.title}
                initial={{ opacity: 0, y: 24 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -4 }}
                className={`rounded-2xl border ${borderColor} bg-warm/3 p-7 transition-all duration-300 hover:shadow-lg`}
              >
                {/* Icon */}
                <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center mb-5`}>
                  <useCase.icon size={22} className={iconColor} />
                </div>

                {/* Title */}
                <h3 className="font-display text-xl font-black text-warm mb-3">
                  {useCase.title}
                </h3>

                {/* Description */}
                <p className="text-warm-400 text-sm leading-relaxed">
                  {useCase.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
