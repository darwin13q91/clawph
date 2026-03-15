import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Download, Mail, User, ChevronDown, Sparkles, Loader2, CheckCircle } from 'lucide-react';

// Extend Window interface for tracking pixels
declare global {
  interface Window {
    fbq?: (command: string, event: string, params?: Record<string, unknown>) => void;
    gtag?: (command: string, event: string, params?: Record<string, unknown>) => void;
  }
}

interface LeadMagnetPopupProps {
  // Configurable delay in milliseconds (default: 30000 = 30 seconds)
  delayMs?: number;
  // Whether to use exit intent trigger (default: true)
  exitIntent?: boolean;
  // Cookie name for remembering closed state
  cookieName?: string;
  // Days to remember dismissal
  cookieDays?: number;
}

interface FormData {
  name: string;
  email: string;
  revenue: string;
}

const REVENUE_OPTIONS = [
  { value: '', label: 'Select your monthly revenue' },
  { value: '0-5k', label: '$0 - $5,000/month' },
  { value: '5k-10k', label: '$5,000 - $10,000/month' },
  { value: '10k-25k', label: '$10,000 - $25,000/month' },
  { value: '25k-50k', label: '$25,000 - $50,000/month' },
  { value: '50k-100k', label: '$50,000 - $100,000/month' },
  { value: '100k+', label: '$100,000+/month' },
];

export default function LeadMagnetPopup({
  delayMs = 30000,
  exitIntent = true,
  cookieName = 'amajungle_leadmagnet_closed',
  cookieDays = 7,
}: LeadMagnetPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    revenue: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  
  const hasTriggered = useRef(false);
  const exitIntentTriggered = useRef(false);

  // Cookie helper functions
  const setCookie = useCallback((name: string, value: string, days: number) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  }, []);

  const getCookie = useCallback((name: string): string | null => {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }, []);

  // Show popup with animation
  const showPopup = useCallback(() => {
    if (hasTriggered.current || getCookie(cookieName)) return;
    hasTriggered.current = true;
    
    setIsVisible(true);
    // Small delay for animation
    setTimeout(() => setIsAnimating(true), 10);

    // Track popup shown event
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'LeadMagnetShown');
    }
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'lead_magnet_shown');
    }
  }, [cookieName, getCookie]);

  // Close popup
  const closePopup = useCallback(() => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      setCookie(cookieName, 'true', cookieDays);
    }, 300);
  }, [cookieName, cookieDays, setCookie]);

  // Exit intent detection
  useEffect(() => {
    if (!exitIntent) return;

    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger when mouse leaves through the top of the page
      if (e.clientY <= 0 && !exitIntentTriggered.current && !getCookie(cookieName)) {
        exitIntentTriggered.current = true;
        showPopup();
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [exitIntent, showPopup, cookieName, getCookie]);

  // Timer-based trigger
  useEffect(() => {
    if (delayMs <= 0) return;

    const timer = setTimeout(() => {
      if (!exitIntentTriggered.current) {
        showPopup();
      }
    }, delayMs);

    return () => clearTimeout(timer);
  }, [delayMs, exitIntent, showPopup]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!formData.revenue) {
      newErrors.revenue = 'Please select your revenue range';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // Send to Echo via API endpoint
      const response = await fetch('/api/lead-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          source: 'lead_magnet_popup',
          timestamp: new Date().toISOString(),
        }),
      });
      
      if (!response.ok) throw new Error('Submission failed');
      
      // Track lead conversion
      if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('track', 'Lead');
      }
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'generate_lead', {
          currency: 'USD',
          value: 0,
        });
      }
      
      setIsSuccess(true);
      
      // Auto-close after success
      setTimeout(() => {
        closePopup();
      }, 3000);
      
    } catch (error) {
      console.error('Lead capture failed:', error);
      setErrors({ email: 'Something went wrong. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle input changes
  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop with glass effect */}
      <div 
        className={`absolute inset-0 bg-jungle/90 backdrop-blur-md transition-opacity duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={closePopup}
        role="presentation"
        aria-hidden="true"
      />
      
      {/* Modal Card */}
      <div 
        className={`relative w-full max-w-md transform transition-all duration-300 ${
          isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        role="dialog"
        aria-label="Download free Amazon Seller's Checklist"
      >
        {/* Glass card with neon border glow */}
        <div className="relative rounded-3xl overflow-hidden">
          {/* Gradient border effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-neon/30 via-violet/30 to-neon/30 rounded-3xl p-[1px]">
            <div className="absolute inset-[1px] bg-jungle rounded-3xl" />
          </div>
          
          {/* Content */}
          <div className="relative bg-gradient-to-br from-jungle via-jungle/95 to-jungle p-8 rounded-3xl">
            {/* Close button */}
            <button
              onClick={closePopup}
              aria-label="Close"
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-warm/5 flex items-center justify-center text-warm-72 hover:bg-warm/10 hover:text-warm transition-colors duration-300"
            >
              <X size={20} />
            </button>
            
            {/* Success state */}
            {isSuccess ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-neon/20 flex items-center justify-center">
                  <CheckCircle className="text-neon" size={40} />
                </div>
                <h3 className="font-display text-2xl font-bold text-warm mb-3">
                  You're all set!
                </h3>
                <p className="text-warm-72 mb-6">
                  Check your email for the Amazon Seller's Checklist. If you don't see it in a few minutes, check your spam folder.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-neon/10 rounded-full text-neon text-sm">
                  <Sparkles size={16} />
                  <span>Bonus tip coming in 5 minutes</span>
                </div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-neon/10 rounded-full text-neon text-sm font-medium mb-4">
                    <Download size={16} />
                    <span>Free Download</span>
                  </div>
                  <h3 className="font-display text-2xl md:text-3xl font-bold text-warm mb-3 leading-tight">
                    Amazon Seller's{' '}
                    <span className="text-gradient">Pre-Launch Checklist</span>
                  </h3>
                  <p className="text-warm-72 text-sm md:text-base">
                    The 12 critical checkpoints that separate sellers who launch to crickets from sellers who hit the ground running.
                  </p>
                </div>
                
                {/* Benefits */}
                <div className="space-y-2 mb-6">
                  {[
                    'Avoid the #1 mistake that kills 60% of new listings',
                    '12-point audit used by 7-figure sellers',
                    'Instant PDF download + bonus automation tips',
                  ].map((benefit, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-neon/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle className="text-neon" size={12} />
                      </div>
                      <span className="text-warm/90 text-sm">{benefit}</span>
                    </div>
                  ))}
                </div>
                
                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name input */}
                  <div>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-warm/40" size={18} />
                      <input
                        type="text"
                        placeholder="Your name"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className={`w-full pl-12 pr-4 py-3.5 bg-warm/5 border rounded-xl text-warm placeholder:text-warm/40 focus:outline-none focus:ring-2 transition-all ${
                          errors.name 
                            ? 'border-red-500 focus:ring-red-500/20' 
                            : 'border-warm/10 focus:border-neon focus:ring-neon/20'
                        }`}
                      />
                    </div>
                    {errors.name && (
                      <p className="text-red-400 text-xs mt-1 ml-1">{errors.name}</p>
                    )}
                  </div>
                  
                  {/* Email input */}
                  <div>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-warm/40" size={18} />
                      <input
                        type="email"
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        className={`w-full pl-12 pr-4 py-3.5 bg-warm/5 border rounded-xl text-warm placeholder:text-warm/40 focus:outline-none focus:ring-2 transition-all ${
                          errors.email 
                            ? 'border-red-500 focus:ring-red-500/20' 
                            : 'border-warm/10 focus:border-neon focus:ring-neon/20'
                        }`}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-red-400 text-xs mt-1 ml-1">{errors.email}</p>
                    )}
                  </div>
                  
                  {/* Revenue dropdown */}
                  <div>
                    <div className="relative">
                      <select
                        value={formData.revenue}
                        onChange={(e) => handleChange('revenue', e.target.value)}
                        className={`w-full pl-4 pr-12 py-3.5 bg-warm/5 border rounded-xl text-warm appearance-none focus:outline-none focus:ring-2 transition-all cursor-pointer ${
                          formData.revenue ? '' : 'text-warm/40'
                        } ${
                          errors.revenue 
                            ? 'border-red-500 focus:ring-red-500/20' 
                            : 'border-warm/10 focus:border-neon focus:ring-neon/20'
                        }`}
                      >
                        {REVENUE_OPTIONS.map((option) => (
                          <option 
                            key={option.value} 
                            value={option.value}
                            className="bg-jungle text-warm"
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-warm/40 pointer-events-none" size={18} />
                    </div>
                    {errors.revenue && (
                      <p className="text-red-400 text-xs mt-1 ml-1">{errors.revenue}</p>
                    )}
                  </div>
                  
                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 bg-gradient-to-r from-neon to-[#9FE870] text-jungle font-bold rounded-xl hover:shadow-lg hover:shadow-neon/20 transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Download size={20} />
                        <span>Get My Free Checklist</span>
                      </>
                    )}
                  </button>
                  
                  {/* Privacy note */}
                  <p className="text-center text-warm/50 text-xs">
                    We respect your privacy. Unsubscribe anytime. 
                    <br />
                    No spam, just actionable Amazon tips.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
