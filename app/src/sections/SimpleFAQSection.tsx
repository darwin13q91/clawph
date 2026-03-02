import { useRef, useLayoutEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ChevronDown, HelpCircle } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const faqs = [
  {
    question: 'Do I need to know how to code?',
    answer: 'Nope. We handle all the technical setup. You control your AI agent through Telegram — just text it like a smart assistant. We also provide a 30-minute training session to make sure you\'re comfortable.',
  },
  {
    question: 'What if it doesn\'t work for me?',
    answer: '30-day money-back guarantee, no questions asked. If your AI agent isn\'t saving you at least 5 hours/week within 30 days, we\'ll refund 100% of your setup fee. You even keep the system.',
  },
  {
    question: 'How is this different from other AI tools?',
    answer: 'Most AI tools are SaaS products you rent monthly. We build a custom agent that runs on YOUR hardware. You own it, control it, and there are no recurring fees (just ~$10-20/mo in API costs).',
  },
  {
    question: 'How long does setup take?',
    answer: 'AI Automation: 48 hours from our kickoff call. Amazon Growth: 1-2 weeks for initial optimization, then ongoing monthly management.',
  },
  {
    question: 'Can I upgrade or change packages later?',
    answer: 'Absolutely. Start with AI Automation, add Amazon management later. Or vice versa. We\'ll credit what you\'ve already paid toward the upgrade.',
  },
  {
    question: 'Who are you? Why should I trust you?',
    answer: 'Fair question. We\'re a new agency (hence the 50% founding discount). Our founder spent 3 years scaling an Amazon FBA business to 7 figures. We\'re hungry to prove ourselves — and we back it with that 30-day guarantee.',
  },
];

export default function SimpleFAQSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

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
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="faq"
      className="relative z-60 bg-jungle py-24 lg:py-32"
    >
      <div className="max-w-3xl mx-auto px-6">
        {/* Header */}
        <div ref={headerRef} className="text-center mb-12">
          <span className="inline-block px-4 py-2 rounded-full bg-neon/10 text-neon text-sm font-mono mb-4">
            Questions?
          </span>
          <h2 className="font-display text-[clamp(36px,4vw,64px)] font-black text-warm uppercase tracking-tight mb-4">
            Frequently Asked
          </h2>
          <p className="text-warm-72 text-lg">
            Everything you need to know before booking a call.
          </p>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="card-jungle overflow-hidden transition-all duration-300 hover:border-neon/20"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full p-6 flex items-center justify-between text-left"
              >
                <span className="font-display text-lg font-bold text-warm pr-4">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`text-neon flex-shrink-0 transition-transform duration-300 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                  size={24}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? 'max-h-96' : 'max-h-0'
                }`}
              >
                <p className="px-6 pb-6 text-warm-72 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Still Have Questions */}
        <div className="mt-12 text-center p-8 rounded-3xl bg-neon/5 border border-neon/20">
          <HelpCircle className="text-neon mx-auto mb-4" size={32} />
          <h3 className="font-display text-xl font-bold text-warm uppercase mb-2">
            Still Have Questions?
          </h3>
          <p className="text-warm-72 mb-6">
            Book a free 15-minute call. No pressure, just answers.
          </p>
          <a
            href="mailto:hello@amajungle.com"
            className="text-neon font-medium hover:underline"
          >
            hello@amajungle.com
          </a>
        </div>
      </div>
    </section>
  );
}
