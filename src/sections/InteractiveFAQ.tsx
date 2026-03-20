import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FAQ {
  question: string;
  answer: string;
}

const faqs: FAQ[] = [
  {
    question: 'What exactly do you automate?',
    answer: 'We build custom AI agents that handle repetitive Amazon tasks: listing optimization, PPC bid adjustments, inventory monitoring, review request automation, pricing updates, and report generation. You describe your workflow, we build the agent.',
  },
  {
    question: 'How long does implementation take?',
    answer: 'Simple automations (single task): 48 hours. Complex multi-step workflows: 5-7 days. Enterprise solutions with integrations: 2-3 weeks. We always provide a timeline before starting.',
  },
  {
    question: 'Do I need technical skills to use this?',
    answer: 'No. We handle all technical setup. You interact with your AI agent through simple interfaces: Telegram notifications, email reports, or a dashboard. If you can use Amazon Seller Central, you can use our automation.',
  },
  {
    question: 'What if something goes wrong?',
    answer: 'Every automation includes safeguards and manual override. Plus, you get 30 days of support after delivery. If anything breaks, we fix it at no cost. Our Echo monitoring agent watches your automations 24/7.',
  },
  {
    question: 'Is my Amazon account safe?',
    answer: 'Yes. We use official Amazon APIs where available. For Seller Central automation, we use secure browser automation with rotating IPs. We never store your password — you control access. River, our AI, follows Amazon\'s Terms of Service guidelines.',
  },
  {
    question: 'What\'s the 30-day guarantee?',
    answer: 'If your automation doesn\'t work as promised within 30 days, you get a full refund. No questions asked. We only win when you win.',
  },
];

export default function InteractiveFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleQuestion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section
      id="faq"
      className="relative z-10 bg-jungle-800/80 backdrop-blur-sm section-lg"
    >
      <div className="container-base">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-500/10 border border-neon-500/20 mb-6"
            >
              <HelpCircle className="w-4 h-4 text-neon-500" aria-hidden="true" />
              <span className="text-neon text-sm font-mono">FAQ</span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-warm leading-[1.1] mb-4"
            >
              Common{' '}
              <span className="text-gradient">Questions</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-warm-400 text-base sm:text-lg"
            >
              Everything you need to know before getting started.
            </motion.p>
          </div>

          {/* FAQ Items */}
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="bg-warm/5 border border-warm/10 rounded-2xl overflow-hidden hover:border-warm/20 transition-colors duration-300"
              >
                <button
                  onClick={() => toggleQuestion(index)}
                  className="w-full flex items-center justify-between p-5 sm:p-6 text-left hover:bg-warm/[0.03] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-500 focus-visible:ring-inset"
                  aria-expanded={openIndex === index}
                  aria-controls={`faq-answer-${index}`}
                >
                  <span className="font-semibold text-warm text-sm sm:text-base lg:text-lg pr-4">
                    {faq.question}
                  </span>
                  <motion.div
                    animate={{ rotate: openIndex === index ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <ChevronDown className="w-5 h-5 text-neon-500 flex-shrink-0" aria-hidden="true" />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {openIndex === index && (
                    <motion.div
                      id={`faq-answer-${index}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-warm-400 text-sm sm:text-base leading-relaxed">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-12 text-center"
          >
            <p className="text-warm-400 text-sm mb-4">Still have questions?</p>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 text-neon-500 hover:text-neon-400 transition-colors font-medium"
            >
              Contact us — we reply within 1 hour
              <ChevronDown className="w-4 h-4 rotate-[-90deg]" aria-hidden="true" />
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
