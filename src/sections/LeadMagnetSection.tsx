import { useRef, useLayoutEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Check, ArrowRight, Mail, Search, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// API endpoint for sending emails
const API_ENDPOINT = 'https://amajungle-email-api.vercel.app/api/send-email';

gsap.registerPlugin(ScrollTrigger);

const auditBenefits = [
  { icon: Search, text: '3 low-hanging fruit opportunities' },
  { icon: TrendingUp, text: 'Revenue projection if fixed' },
  { icon: AlertCircle, text: 'Priority action plan' },
];

export default function LeadMagnetSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState('');
  const [storeUrl, setStoreUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        contentRef.current,
        { y: '6vh', opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          scrollTrigger: {
            trigger: contentRef.current,
            start: 'top 80%',
            end: 'top 55%',
            scrub: 0.5,
          },
        }
      );
    }, section);

    return () => ctx.revert();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Email validation
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    // Store URL validation (if provided)
    if (storeUrl) {
      const amazonUrlRegex = /https?:\/\/(www\.)?(amazon\.(com|co\.[a-z]{2})|amzn\.to)\/.*/i;
      if (!amazonUrlRegex.test(storeUrl)) {
        toast.error('Please enter a valid Amazon URL (amazon.com, amazon.co.uk, etc.)');
        return;
      }
    }
    
    setIsSubmitting(true);
    
    try {
      // Format subject for Echo intent detection
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
      setSubmitted(true);
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
      className="relative z-60 bg-jungle py-24 lg:py-32"
    >
      {/* Background */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url('/images/hero_leaf_bg.jpg')`,
          backgroundSize: 'cover',
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <div 
          ref={contentRef}
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center"
        >
          {/* Left - Value Prop */}
          <div>
            <span className="inline-block px-4 py-2 rounded-full bg-neon/10 text-neon text-sm font-mono mb-6">
              Free — No Credit Card Required
            </span>
            
            <h2 className="font-display text-[clamp(32px,4vw,48px)] font-black text-warm uppercase tracking-tight mb-6">
              Get Your Free<br />
              <span className="text-neon">Amazon Audit</span>
            </h2>
            
            <p className="text-warm-72 text-lg mb-8 leading-relaxed">
              Send us your store URL and we'll deliver a detailed written audit 
              showing exactly what's hurting your sales and how to fix it.
            </p>

            <div className="space-y-4">
              {auditBenefits.map((benefit) => (
                <div key={benefit.text} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-neon/20 flex items-center justify-center">
                    <benefit.icon className="text-neon" size={18} />
                  </div>
                  <span className="text-warm">{benefit.text}</span>
                </div>
              ))}
            </div>

            {/* Social Proof (Even if small) */}
            <div className="mt-10 p-4 rounded-2xl bg-warm/5 border border-warm/10">
              <p className="text-warm-72 text-sm italic mb-2">
                "The audit found 3 issues I never knew existed. Fixed them and saw a 15% bump in conversions within 2 weeks."
              </p>
              <p className="text-warm text-sm font-medium">
                — Beta tester, Home & Kitchen seller
              </p>
            </div>
          </div>

          {/* Right - Form */}
          <div className="card-jungle p-8 lg:p-10">
            {!submitted ? (
              <>
                <h3 className="font-display text-xl font-bold text-warm uppercase mb-2">
                  Request Your Free Audit
                </h3>
                <p className="text-warm-72 text-sm mb-8">
                  We'll deliver your written audit within 1 hour.
                </p>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-warm text-sm font-medium mb-2">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-warm/40" size={18} />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@yourstore.com"
                        className="w-full pl-12 pr-4 py-4 rounded-xl bg-warm/5 border border-warm/20 text-warm placeholder-warm/40 focus:outline-none focus:border-neon transition-colors"
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
                      placeholder="https://www.amazon.com/dp/B08N5WRWNW or https://amazon.com/sp?seller=..."
                      className="w-full px-4 py-4 rounded-xl bg-warm/5 border border-warm/20 text-warm placeholder-warm/40 focus:outline-none focus:border-neon transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        Get My Free Audit
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>

                <p className="text-warm-72 text-xs text-center mt-6">
                  No spam. Unsubscribe anytime. We respect your privacy.
                </p>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-neon/20 flex items-center justify-center mx-auto mb-6">
                  <Check className="text-neon" size={32} />
                </div>
                <h3 className="font-display text-xl font-bold text-warm uppercase mb-3">
                  Audit Requested!
                </h3>
                <p className="text-warm-72 mb-6">
                  Check your inbox for confirmation. Your audit report will arrive within 1 hour.
                </p>
                <p className="text-neon text-sm font-mono">
                  While you wait, book a free call to discuss your goals →
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
