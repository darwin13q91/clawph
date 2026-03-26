import { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Send, Mail, Phone, MapPin, MessageSquare, ChevronDown, Loader2, CheckCircle2, Zap, TrendingUp, Globe, Search, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import CalendlyButton from '../components/CalendlyButton';

// API endpoint for sending emails
const API_ENDPOINT = 'https://amajungle-email-api.vercel.app/api/send-email';

interface FormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  service: string;
  message: string;
}

const initialFormData: FormData = {
  name: '',
  email: '',
  phone: '',
  company: '',
  service: '',
  message: '',
};

const services = [
  { value: '', label: 'Select a service...', icon: HelpCircle },
  { value: 'ai_automation', label: 'River AI Intelligence — $499', icon: Zap },
  { value: 'amazon_growth', label: 'River Amazon Growth — Custom Pricing', icon: TrendingUp },
  { value: 'website_dev', label: 'Brand Website — $599', icon: Globe },
  { value: 'audit', label: 'Free Amazon Audit', icon: Search },
  { value: 'other', label: 'Other / Not sure yet', icon: HelpCircle },
];

const contactInfo = [
  {
    icon: Mail,
    label: 'Email us',
    value: 'hello@amajungle.com',
    href: 'mailto:hello@amajungle.com',
  },
  {
    icon: Phone,
    label: 'Call or text',
    value: '+63 0995 450 5206',
    href: 'tel:+6309954505206',
  },
  {
    icon: MapPin,
    label: 'Based in',
    value: 'Philippines • Remote worldwide',
    href: null,
  },
];

export default function ContactSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast.error('Please enter your name');
      return false;
    }

    if (!formData.email.trim()) {
      toast.error('Please enter your email');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return false;
    }

    if (!formData.service) {
      toast.error('Please select a service');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
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
      setIsSubmitted(true);
      setFormData(initialFormData);
    } catch {
      toast.error(
        <span>
          Something went wrong.{' '}
          <a href="mailto:ops@amajungle.com" className="underline hover:text-neon-400">
            Email us at ops@amajungle.com
          </a>
        </span>
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      ref={sectionRef}
      id="contact"
      className="relative z-10 bg-jungle-700/80 backdrop-blur-sm section-lg overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url('/images/violet_flower_bg.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-jungle-700/90 via-jungle-800/95 to-jungle-900/90" />
      </div>

      <div className="container-base relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-500/10 border border-neon-500/20 mb-6">
              <span className="text-neon text-sm font-mono font-medium">Let\'s Talk</span>
            </div>

            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-warm uppercase tracking-tight leading-[1.1] mb-6">
              Ready to Get
              <span className="block text-gradient mt-2">5+ Hours Back?</span>
            </h2>

            <p className="text-warm-400 text-lg leading-relaxed mb-10 max-w-md">
              Book a free 30-minute call. We\'ll learn about your business, identify your
              biggest time-wasters, and show you exactly how we can help — no pressure,
              no pitch.
            </p>

            <CalendlyButton className="mb-10">
              Book Free 30-Min Call
            </CalendlyButton>

            <div className="space-y-5">
              {contactInfo.map((item) => (
                <div key={item.label} className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-neon-500/10 border border-neon-500/20 flex items-center justify-center">
                    <item.icon className="text-neon-500" size={20} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-warm-400 text-sm">{item.label}</p>
                    {item.href ? (
                      <a
                        href={item.href}
                        className="text-warm font-medium hover:text-neon-500 transition-colors"
                      >
                        {item.value}
                      </a>
                    ) : (
                      <p className="text-warm font-medium">{item.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Form Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="card card-elevated p-6 sm:p-8 lg:p-10">
              {!isSubmitted ? (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-neon-500/10 flex items-center justify-center">
                      <MessageSquare className="text-neon-500" size={20} aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg sm:text-xl font-bold text-warm uppercase">
                        Send a Message
                      </h3>
                      <p className="text-warm-400 text-sm">We reply within 1 hour</p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
                          placeholder="Your name"
                          className="input"
                          required
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
                          placeholder="you@company.com"
                          className="input"
                          required
                        />
                      </div>
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
                          placeholder="+1 (555) 000-0000"
                          className="input"
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
                          placeholder="Your brand or store"
                          className="input"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="service" className="block text-warm text-sm font-medium mb-2">
                        Service Interested In *
                      </label>
                      <div className="relative">
                        <select
                          id="service"
                          name="service"
                          value={formData.service}
                          onChange={handleChange}
                          className="select"
                          required
                        >
                          {services.map((service) => (
                            <option key={service.value} value={service.value}>
                              {service.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-warm-400 pointer-events-none"
                          size={20}
                          aria-hidden="true"
                        />
                      </div>
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
                        placeholder="Example: I spend 10 hours a week on PPC monitoring and inventory tracking..."
                        className="textarea"
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
                          <span>Send Message</span>
                          <Send size={18} aria-hidden="true" />
                        </>
                      )}
                    </button>
                  </form>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <div className="w-16 h-16 rounded-full bg-neon-500/20 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="text-neon-500" size={32} aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-warm uppercase mb-3">
                    Message Sent!
                  </h3>
                  <p className="text-warm-400 mb-6">
                    We\'ll be in touch within 1 hour.
                  </p>
                  <button
                    onClick={() => setIsSubmitted(false)}
                    className="text-neon-500 hover:text-neon-400 transition-colors text-sm font-medium"
                  >
                    Send another message
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
