import { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, Mail, Search, TrendingUp, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

// API endpoint for sending emails
const API_ENDPOINT = 'https://amajungle-email-api.vercel.app/api/send-email';

interface Benefit {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  text: string;
}

const auditBenefits: Benefit[] = [
  { icon: Search, text: '3 low-hanging fruit opportunities' },
  { icon: TrendingUp, text: 'Revenue projection if fixed' },
  { icon: AlertCircle, text: 'Priority action plan' },
];

export default function LeadMagnetSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  const [email, setEmail] = useState('');
  const [storeUrl, setStoreUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validateForm = (): boolean => {
    if (!email) {
      toast.error('Please enter your email');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return false;
    }

    if (storeUrl) {
      const amazonUrlRegex = /https?:\/\/(www\.)?(amazon\.(com|co\.[a-z]{2})|amzn\.to)\/.*/i;
      if (!amazonUrlRegex.test(storeUrl)) {
        toast.error('Please enter a valid Amazon URL');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const subject = `New Lead: audit - Audit Request from ${email.split('@')[0]}`;

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to_email: email,
          subject: subject,
          from_name: 'Audit Request',
          service: 'audit',
          client_name: email.split('@')[0],
          client_email: email,
          client_phone: '',
          client_company: storeUrl || 'Not provided',
          client_message: `Store URL: ${storeUrl || 'Not provided'}\n\nRequesting a free Amazon store audit.`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      toast.success('Audit request received! Check your email in less than 1 hour.');
      setIsSubmitted(true);
    } catch {
      toast.error('Something went wrong. Please email us directly at hello@amajungle.com');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      ref={sectionRef}
      id="audit"
      className="relative z-10 bg-jungle-800/80 backdrop-blur-sm section-xl overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url('/images/hero_leaf_bg.jpg')`,
            backgroundSize: 'cover',
          }}
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-0 right-0 w-[600px] h-[600px] bg-neon-500/10 rounded-full blur-[150px]"
        />
      </div>

      <div className="container-base relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left - Value Prop */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-500/10 text-neon text-sm font-mono mb-6">
              Free — No Credit Card Required
            </div>

            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-warm uppercase tracking-tight leading-[1.1] mb-6">
              Get Your Free
              <span className="block text-gradient mt-2">Amazon Audit</span>
            </h2>

            <p className="text-warm-400 text-lg leading-relaxed mb-8">
              Send us your store URL and we\'ll deliver a detailed written audit showing
              exactly what\'s hurting your sales and how to fix it.
            </p>

            <div className="space-y-4 mb-10">
              {auditBenefits.map((benefit, i) => (
                <motion.div
                  key={benefit.text}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
                  className="flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-neon-500/10 border border-neon-500/20 flex items-center justify-center group-hover:bg-neon-500/20 transition-colors">
                    <benefit.icon className="text-neon-500" size={20} aria-hidden="true" />
                  </div>
                  <span className="text-warm font-medium">{benefit.text}</span>
                </motion.div>
              ))}
            </div>

            {/* Social Proof */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="p-6 rounded-2xl bg-warm/5 border border-warm/10"
            >
              <blockquote className="text-warm-400 text-sm italic mb-4 leading-relaxed">
                "The audit found 3 issues I never knew existed. Fixed them and saw a 15%
                bump in conversions within 2 weeks."
              </blockquote>
              <cite className="text-warm text-sm font-medium not-italic">
                — Beta tester, Home & Kitchen seller
              </cite>
            </motion.div>
          </motion.div>

          {/* Right - Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="card card-elevated p-6 sm:p-8 lg:p-10">
              {!isSubmitted ? (
                <>
                  <div className="mb-6">
                    <h3 className="font-display text-xl font-bold text-warm uppercase mb-2">
                      Request Your Free Audit
                    </h3>
                    <p className="text-warm-400 text-sm">We\'ll deliver your written audit within 1 hour.</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label className="block text-warm text-sm font-medium mb-2">
                        Email Address *
                      </label>
                      <div className="relative">
                        <Mail
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-400"
                          size={18}
                          aria-hidden="true"
                        />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@yourstore.com"
                          className="input pl-12"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-warm text-sm font-medium mb-2">
                        Amazon Store Product URL (optional)
                      </label>
                      <input
                        type="url"
                        value={storeUrl}
                        onChange={(e) => setStoreUrl(e.target.value)}
                        placeholder="https://www.amazon.com/dp/B08N5WRWNW"
                        className="input"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="animate-spin" size={18} aria-hidden="true" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <span>Get My Free Audit</span>
                          <ArrowRight size={18} aria-hidden="true" />
                        </>
                      )}
                    </button>
                  </form>

                  <p className="text-warm-400 text-xs text-center mt-6">
                    No spam. Unsubscribe anytime. We respect your privacy.
                  </p>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <div className="w-16 h-16 rounded-full bg-neon-500/20 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="text-neon-500" size={32} aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-warm uppercase mb-3">
                    Audit Requested!
                  </h3>
                  <p className="text-warm-400 mb-6">
                    Check your inbox for confirmation. Your audit report will arrive within 1 hour.
                  </p>
                  <p className="text-neon text-sm font-mono">
                    While you wait, book a free call to discuss your goals →
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
