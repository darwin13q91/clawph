/**
 * GuaranteeSection — 30-day money-back guarantee section.
 * Shown after pricing to reinforce trust before the final CTA.
 */
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Shield, Check } from 'lucide-react';

export default function GuaranteeSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="guarantee" className="py-20 lg:py-28 bg-jungle-900/30" ref={ref}>
      <div className="container-base">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto"
        >
          <div className="relative p-8 lg:p-12 rounded-[2rem] bg-gradient-to-br from-neon-500/8 to-transparent border border-neon-500/25 overflow-hidden text-center">
            {/* Decorative glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-neon-500/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/15 rounded-full blur-[60px] pointer-events-none" />

            <div className="relative z-10">
              {/* Shield icon */}
              <div className="w-16 h-16 rounded-full bg-neon-500/15 flex items-center justify-center mx-auto mb-6">
                <Shield size={28} className="text-neon-500" />
              </div>

              <h2 className="font-display text-3xl lg:text-4xl font-black text-warm tracking-tight mb-3">
                30-Day Money-Back Guarantee
              </h2>
              <p className="text-neon-500 text-sm font-mono font-bold tracking-widest mb-8">
                No questions asked
              </p>

              {/* Bullets */}
              <div className="space-y-3 mb-8 text-left max-w-sm mx-auto">
                {[
                  'AI assistant must save you 5+ hours/week or full refund',
                  'You keep all workflows we built even if you cancel',
                  'Free 1-hour exit call to diagnose any issues',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <Check size={15} className="text-neon-500 flex-shrink-0 mt-0.5" />
                    <span className="text-warm-400 text-sm">{item}</span>
                  </div>
                ))}
              </div>

              <p className="text-warm/50 text-sm italic">
                "We built this for the Philippines. If it doesn't work for you, you don't pay."
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
