/**
 * WhyClawPHSection — ClawPH vs DIY / generic AI comparison.
 * Focused on buyer clarity, not just technical features.
 */
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Check, X, Users, Bot, ShieldCheck, Clock } from 'lucide-react';

const comparisonRows = [
  {
    feature: 'Model',
    clawph: 'One-time purchase, you own it',
    diy: 'Subscription, you rent it',
    icon: Clock,
  },
  {
    feature: 'Data storage',
    clawph: 'On your own machine',
    diy: 'On vendor\'s servers',
    icon: ShieldCheck,
  },
  {
    feature: 'PH payment methods',
    clawph: 'GCash, Maya, QRPH ready',
    diy: 'USD only, if at all',
    icon: ShieldCheck,
  },
  {
    feature: 'Your own infrastructure',
    clawph: 'Yes — you own everything',
    diy: 'Depends on platform',
    icon: Bot,
  },
  {
    feature: 'Workflow customization',
    clawph: '5 workflows built to your needs',
    diy: 'Generic templates, your problem',
    icon: Settings,
  },
];

// Reusing Settings from above - fix the import
import { Settings } from 'lucide-react';

const valueProps = [
  {
    icon: ShieldCheck,
    title: 'Owned, not rented',
    description:
      'Pay once. The OpenClaw system runs on your own machine forever. No vendor can shut it down, raise prices, or read your data.',
  },
  {
    icon: Clock,
    title: 'Works while you sleep',
    description:
      'Your AI assistant handles messages, drafts, and follow-ups around the clock. It doesn\'t take sick days or holidays.',
  },
  {
    icon: Users,
    title: 'Local PH expertise',
    description:
      'Built for Philippine businesses. GCash, Maya, BIR compliance, SSS tracking — workflows that actually fit how Filipino businesses operate.',
  },
];

export default function WhyClawPHSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="why-clawph" className="py-20 lg:py-28" ref={ref}>
      <div className="container-base">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <p className="text-neon-500 text-sm font-mono font-semibold tracking-widest uppercase mb-3">
            Why ClawPH
          </p>
          <h2 className="font-display text-3xl lg:text-5xl font-black text-warm tracking-tight leading-tight">
            Why not just use ChatGPT or build it yourself?
          </h2>
          <p className="text-warm-400 text-lg mt-4 max-w-2xl mx-auto">
            Generic AI tools give you a chatbot. ClawPH gives you a deployed, supported, customized AI assistant that talks to your channels and handles your workflows.
          </p>
        </motion.div>

        {/* Comparison table */}
        <div className="max-w-3xl mx-auto mb-16">
          <div className="rounded-2xl border border-warm/10 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-3 bg-warm/5 border-b border-warm/10">
              <div className="p-4 text-warm-400 text-xs font-mono uppercase tracking-wider">
                Feature
              </div>
              <div className="p-4 text-center border-l border-warm/10">
                <span className="text-neon-500 font-mono text-xs font-bold tracking-wider uppercase">
                  ClawPH
                </span>
              </div>
              <div className="p-4 text-center border-l border-warm/10">
                <span className="text-warm-400 font-mono text-xs font-bold tracking-wider uppercase opacity-50">
                  DIY / Generic AI
                </span>
              </div>
            </div>

            {/* Rows */}
            {comparisonRows.map((row, i) => (
              <motion.div
                key={row.feature}
                initial={{ opacity: 0, y: 10 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.3, delay: i * 0.08 }}
                className={`grid grid-cols-3 border-b border-warm/5 last:border-0 ${
                  i % 2 === 0 ? 'bg-transparent' : 'bg-warm/[0.02]'
                }`}
              >
                <div className="p-4 flex items-center gap-2">
                  <row.icon size={14} className="text-warm-400 flex-shrink-0" />
                  <span className="text-warm text-sm font-medium">{row.feature}</span>
                </div>
                <div className="p-4 text-center border-l border-warm/10 flex items-center justify-center">
                  <span className="text-neon-500 text-xs font-semibold flex items-center gap-1">
                    <Check size={13} /> {row.clawph}
                  </span>
                </div>
                <div className="p-4 text-center border-l border-warm/10 flex items-center justify-center">
                  <span className="text-warm-400 text-xs opacity-60 flex items-center gap-1">
                    <X size={13} className="opacity-40" /> {row.diy}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Value props */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {valueProps.map((vp, i) => (
            <motion.div
              key={vp.title}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
              className="rounded-2xl border border-warm/10 bg-warm/3 p-6 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-neon-500/10 flex items-center justify-center mx-auto mb-4">
                <vp.icon size={22} className="text-neon-500" />
              </div>
              <h3 className="font-display text-lg font-black text-warm mb-2">{vp.title}</h3>
              <p className="text-warm-400 text-sm leading-relaxed">{vp.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
