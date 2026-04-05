/**
 * FAQSection — Clean FAQ accordion for the landing page.
 */
import { useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: "What's the difference between Growth and Setup?",
    answer:
      "Setup is a one-time service — we build your OpenClaw system and hand it over. You own it forever and run it yourself. Growth is ongoing support where we actively manage and optimize your deployment month-to-month, including weekly reviews and a priority support channel.",
  },
  {
    question: 'Do I need technical skills to use OpenClaw?',
    answer:
      "No. OpenClaw is designed to be operated via chat — Telegram, Discord, or WhatsApp. If you can message a friend, you can use it. We handle all the technical setup. You just talk to your AI assistant like a colleague.",
  },
  {
    question: 'How does the 30-day guarantee work?',
    answer:
      "If OpenClaw doesn't save you 5+ hours in the first 30 days or you're not satisfied for any reason, we refund 100% of your setup fee. You keep any workflows we built. No hoops to jump through.",
  },
  {
    question: 'Can I cancel the Growth plan anytime?',
    answer:
      "Yes. Just give us 30 days' notice — no penalties, no lock-in, no questions asked. We're confident enough in the value to not need contracts.",
  },
  {
    question: 'Can I pay with GCash, Maya, or QRPH?',
    answer:
      "Yes. Our checkout supports GCash, Maya, QRPH, Visa, Mastercard, and bank transfer. All pricing is shown in Philippine Pesos first, with USD fallback.",
  },
  {
    question: 'What happens after I book?',
    answer:
      "You'll get a Calendly confirmation + a prep email. We'll assess your current setup before the call so every minute is valuable. The call is free and comes with no obligation.",
  },
  {
    question: 'Who owns the infrastructure?',
    answer:
      "You do. The OpenClaw system runs on your server or cloud account. Your data never touches ours. With the Setup plan you get full ownership; with Growth we manage it on your behalf but it's still yours.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="faq" className="py-20 lg:py-28" ref={ref}>
      <div className="container-base">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <p className="text-neon-500 text-sm font-mono font-semibold tracking-widest uppercase mb-3">
            FAQ
          </p>
          <h2 className="font-display text-3xl lg:text-5xl font-black text-warm tracking-tight leading-tight">
            Common questions
          </h2>
        </motion.div>

        {/* Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="max-w-2xl mx-auto space-y-3"
        >
          {faqItems.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                className="rounded-xl border border-warm/10 overflow-hidden bg-warm/3"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left gap-4 hover:bg-warm/5 transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className="text-warm font-medium text-sm pr-2">{item.question}</span>
                  <ChevronDown
                    size={18}
                    className={`text-warm-400 flex-shrink-0 transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isOpen ? 'max-h-96' : 'max-h-0'
                  }`}
                >
                  <p className="px-5 pb-5 text-warm-400 text-sm leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
