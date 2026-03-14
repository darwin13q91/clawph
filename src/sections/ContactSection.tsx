import { useRef, useLayoutEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Send, Mail, Phone, MapPin, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import CalendlyButton from '../components/CalendlyButton';

// API endpoint for sending emails
const API_ENDPOINT = 'https://amajungle-email-api.vercel.app/api/send-email';

gsap.registerPlugin(ScrollTrigger);

export default function ContactSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    service: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    
    // Validation
    if (!formData.name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    
    if (!formData.email.trim()) {
      toast.error('Please enter your email');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    if (!formData.service.trim()) {
      toast.error('Please select a service');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Format subject line: "New Lead: {service} - {name} from {company}"
      const subject = `New Lead: ${formData.service} - ${formData.name} from ${formData.company || 'N/A'}`;
      
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to_email: formData.email,
          subject: subject,
          from_name: formData.name,
          service: formData.service,
          client_name: formData.name,
          client_email: formData.email,
          client_phone: formData.phone || 'Not provided',
          client_company: formData.company || 'Not provided',
          client_message: formData.message || 'No additional message provided',
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send email');
      }
      
      toast.success('Message sent! We\'ll reply within 1 hour.');
      setFormData({ name: '', email: '', phone: '', company: '', service: '', message: '' });
    } catch {
      toast.error('Something went wrong. Please email us directly at hello@amajungle.com');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <section
      ref={sectionRef}
      id="contact"
      className="relative z-60 py-24 lg:py-32"
      style={{ background: 'linear-gradient(135deg, #6E2E8C 0%, #5c2575 100%)' }}
    >
      {/* Background texture */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url('/images/violet_flower_bg.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="absolute inset-0 bg-violet/80" />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <div ref={contentRef} className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Left Content */}
          <div>
            <span className="inline-block px-4 py-2 rounded-full bg-neon/10 text-neon text-sm font-mono mb-6">
              Let's Talk
            </span>
            
            <h2 className="font-display text-[clamp(36px,4vw,64px)] font-black text-warm uppercase tracking-tight mb-6">
              Ready to Get<br />
              <span className="text-neon">5+ Hours Back?</span>
            </h2>
            
            <p className="text-warm-72 text-lg leading-relaxed mb-10">
              Book a free 30-minute call. We'll learn about your business, 
              identify your biggest time-wasters, and show you exactly how 
              we can help — no pressure, no pitch.
            </p>

            <CalendlyButton className="mb-10">
              Book Free 30-Min Call
            </CalendlyButton>

            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-neon/20 flex items-center justify-center">
                  <Mail className="text-neon" size={20} />
                </div>
                <div>
                  <p className="text-warm-72 text-sm">Email us</p>
                  <p className="text-warm font-medium">hello@amajungle.com</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-neon/20 flex items-center justify-center">
                  <Phone className="text-neon" size={20} />
                </div>
                <div>
                  <p className="text-warm-72 text-sm">Call or text</p>
                  <p className="text-warm font-medium">+63 0995 450 5206</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-neon/20 flex items-center justify-center">
                  <MapPin className="text-neon" size={20} />
                </div>
                <div>
                  <p className="text-warm-72 text-sm">Based in</p>
                  <p className="text-warm font-medium">Philippines • Remote worldwide</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div
            className="card-jungle p-8 lg:p-10"
            style={{ background: 'rgba(11, 58, 44, 0.95)' }}
          >
            <div className="flex items-center gap-3 mb-6">
              <MessageSquare className="text-neon" size={24} />
              <h3 className="font-display text-xl font-bold text-warm uppercase">
                Send a Message
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-warm text-sm font-medium mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-warm/5 border border-warm/20 text-warm placeholder-warm/40 focus:outline-none focus:border-neon transition-colors"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-warm text-sm font-medium mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-warm/5 border border-warm/20 text-warm placeholder-warm/40 focus:outline-none focus:border-neon transition-colors"
                  placeholder="you@company.com"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="phone" className="block text-warm text-sm font-medium mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-warm/5 border border-warm/20 text-warm placeholder-warm/40 focus:outline-none focus:border-neon transition-colors"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                <div>
                  <label htmlFor="company" className="block text-warm text-sm font-medium mb-2">
                    Company
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-warm/5 border border-warm/20 text-warm placeholder-warm/40 focus:outline-none focus:border-neon transition-colors"
                    placeholder="Your brand or store"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="service" className="block text-warm text-sm font-medium mb-2">
                  Service Interested In *
                </label>
                <select
                  id="service"
                  name="service"
                  value={formData.service}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-warm/5 border border-warm/20 text-warm focus:outline-none focus:border-neon transition-colors appearance-none"
                >
                  <option value="" className="bg-jungle">Select a service...</option>
                  <option value="ai_automation" className="bg-jungle">AI Intelligence Setup — $997</option>
                  <option value="amazon_growth" className="bg-jungle">Amazon Growth Management — $999/mo</option>
                  <option value="website_dev" className="bg-jungle">Brand Website Development — $1,497</option>
                  <option value="audit" className="bg-jungle">Free Amazon Audit</option>
                  <option value="other" className="bg-jungle">Other / Not sure yet</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-warm text-sm font-medium mb-2">
                  Tell us more about what you need (optional)
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-warm/5 border border-warm/20 text-warm placeholder-warm/40 focus:outline-none focus:border-neon transition-colors resize-none"
                  placeholder="Example: I spend 10 hours a week on PPC monitoring and inventory tracking..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="animate-pulse">Sending...</span>
                ) : (
                  <>
                    Send Message
                    <Send size={18} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
