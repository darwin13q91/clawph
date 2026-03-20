import { useRef, useLayoutEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ChevronDown, HelpCircle } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const faqs = [
  {
    question: 'Do I need to know how to code?',
    answer: 'Nope. We handle all the technical setup. You access your intelligence dashboard through Telegram — just text it for insights like a smart assistant. We also provide a 30-minute training session to make sure you\'re comfortable.',
  },
  {
    question: 'What if it doesn\'t work for me?',
    answer: '30-day money-back guarantee, no questions asked. If your intelligence system isn\'t saving you at least 5 hours/week within 30 days, we\'ll refund 100% of your setup fee. You even keep the system.',
  },
  {
    question: 'How is this different from other AI tools?',
    answer: 'Most AI tools are SaaS products you rent monthly. We build a custom intelligence system that runs on YOUR hardware. You own it, control it, and there are no recurring fees (just ~$10-20/mo in API costs).',
  },
  {
    question: 'How long does setup take?',
    answer: 'AI Intelligence: 48 hours from our kickoff call. Amazon Growth: 1-2 weeks for initial optimization, then ongoing monthly management.',
  },
  {
    question: 'Can I upgrade or change packages later?',
    answer: 'Absolutely. Start with AI Intelligence, add Amazon management later. Or vice versa. We\'ll credit what you\'ve already paid toward the upgrade.',
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
      className="relative z-10 bg-jungle/80 backdrop-blur-sm py-24 lg:py-32"
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
              className="card-jungle overflow-hidden card-lift"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full p-6 flex items-center justify-between text-left group"
                aria-expanded={openIndex === index}
              >
                <span className="font-display text-lg font-bold text-warm pr-4 group-hover:text-neon transition-colors duration-300">
                  {faq.question}
                </span>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-neon/10 flex items-center justify-center transition-all duration-300 ${
                  openIndex === index ? 'bg-neon/20 rotate-180' : 'group-hover:bg-neon/15'
                }`}>
                  <ChevronDown
                    className="text-neon transition-transform duration-300"
                    size={20}
                  />
                </div>
              </button>
              <div
                className={`grid transition-all duration-400 ease-out ${
                  openIndex === index ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                }`}
              >
                <div className="overflow-hidden">
                  <p className="px-6 pb-6 text-warm-72 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Still Have Questions */}
        <div className="mt-12 text-center p-8 rounded-3xl bg-neon/5 border border-neon/20 card-lift group">
          <HelpCircle className="text-neon mx-auto mb-4 transition-transform duration-300 group-hover:scale-110" size={32} />
          <h3 className="font-display text-xl font-bold text-warm uppercase mb-2">
            Still Have Questions?
          </h3>
          <p className="text-warm-72 mb-6">
            Book a free 30-minute call. No pressure, just answers.
          </p>
          <a
            href="mailto:hello@amajungle.com"
            className="link-underline text-neon font-medium"
          >
            hello@amajungle.com
          </a>
        </div>
      </div>
    </section>
  );
}
