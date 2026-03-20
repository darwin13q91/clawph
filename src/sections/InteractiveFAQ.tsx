import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';

const faqs = [
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

  return (
    <section className="py-20 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-12 bg-jungle relative overflow-hidden">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10 sm:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-neon/10 border border-neon/20 mb-4 sm:mb-6"
          >
            <HelpCircle className="w-4 h-4 text-neon" />
            <span className="text-neon text-xs sm:text-sm font-mono">FAQ</span>
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-warm mb-4"
          >
            Common{' '}
            <span className="text-neon">Questions</span>
          </motion.h2>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="bg-warm/5 border border-warm/10 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-4 sm:p-6 text-left hover:bg-warm/5 transition-colors"
              >
                <span className="font-semibold text-warm text-sm sm:text-base lg:text-lg pr-4">
                  {faq.question}
                </span>
                <motion.div
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDown className="w-5 h-5 text-neon flex-shrink-0" />
                </motion.div>
              </button>
              
              <AnimatePresence initial={false}>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <div className="px-4 sm:px-6 pb-4 sm:pb-6 text-warm-72 text-sm sm:text-base leading-relaxed">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
