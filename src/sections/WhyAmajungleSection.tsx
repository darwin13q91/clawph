import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ShoppingBag, CreditCard, ShieldCheck } from 'lucide-react';

const differentiators = [
  {
    icon: ShoppingBag,
    text: 'Built by Amazon sellers, not theorists',
  },
  {
    icon: CreditCard,
    text: 'One-time pricing — you own it forever',
  },
  {
    icon: ShieldCheck,
    text: '30-day guarantee, no questions asked',
  },
];

export default function WhyAmajungleSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section
      ref={sectionRef}
      id="why"
      className="relative z-10 bg-jungle-800/50 backdrop-blur-sm py-16 overflow-hidden"
    >
      <div className="container-base">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-10"
        >
          <h2 className="font-display text-2xl sm:text-3xl font-black text-warm uppercase tracking-tight">
            Why Amajungle?
          </h2>
        </motion.div>

        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
          }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8"
        >
          {differentiators.map((item) => (
            <motion.div
              key={item.text}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
              }}
              className="flex items-center gap-3 px-5 py-3 rounded-xl bg-neon/5 border border-neon/15"
            >
              <item.icon className="text-neon flex-shrink-0" size={18} aria-hidden="true" />
              <span className="text-warm text-sm font-medium text-left">{item.text}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
