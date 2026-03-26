import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, X, Sparkles } from 'lucide-react';

interface CalendlyButtonProps {
  children?: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export default function CalendlyButton({ 
  children = 'Book a call', 
  className = '',
  variant = 'primary',
  size = 'md',
  showIcon = true,
}: CalendlyButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }
    
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const getButtonClasses = () => {
    const baseClasses = 'inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-all duration-300';
    
    const variantClasses = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      ghost: 'btn-ghost',
    };
    
    const sizeClasses = {
      sm: 'btn-sm',
      md: '',
      lg: 'btn-lg',
    };
    
    return `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
  };

  return (
    <>
      {/* Button */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(true)}
        className={getButtonClasses()}
      >
        {showIcon && <Calendar size={size === 'sm' ? 16 : 18} />}
        {children}
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-jungle/95 backdrop-blur-xl"
              onClick={() => setIsOpen(false)}
              role="presentation"
              aria-hidden="true"
            />
            
            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-5xl h-[85vh] bg-jungle rounded-3xl overflow-hidden shadow-2xl border border-warm/10"
              role="dialog"
              aria-modal="true"
              aria-label="Schedule a strategy call with amajungle"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 lg:p-6 border-b border-warm/10 bg-jungle-dark/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neon/20 flex items-center justify-center">
                    <Sparkles className="text-neon" size={20} />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-warm">Book Your Strategy Call</h3>
                    <p className="text-warm-72 text-sm">Free 30-minute Amazon consultation</p>
                  </div>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsOpen(false)}
                  aria-label="Close scheduling dialog"
                  className="w-10 h-10 rounded-xl bg-warm/5 flex items-center justify-center text-warm-72 hover:bg-warm/10 hover:text-warm transition-colors duration-300"
                >
                  <X size={20} />
                </motion.button>
              </div>
              
              {/* Calendly Booking */}
              <div className="w-full h-[calc(85vh-80px)] flex flex-col items-center justify-center p-8 lg:p-12 bg-jungle-dark/30">
                {/* Calendar Icon */}
                <div className="w-20 h-20 rounded-2xl bg-neon/10 flex items-center justify-center mb-6">
                  <Calendar className="text-neon" size={40} />
                </div>
                
                {/* Message */}
                <h4 className="font-display text-2xl lg:text-3xl font-bold text-warm text-center mb-3">
                  Ready to Grow Your Amazon Business?
                </h4>
                <p className="text-warm-72 text-center text-lg mb-8 max-w-md">
                  Click the button below to book your free 30-minute strategy call. 
                  Pick a time that works for you — we'll take care of the rest.
                </p>
                
                {/* Book Now Button */}
                <a
                  href="https://calendly.com/ops-amajungle/30min"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-8 py-4 bg-neon text-jungle font-bold text-lg rounded-full hover:opacity-90 transition-all duration-300 shadow-lg shadow-neon/25"
                >
                  <Calendar size={22} />
                  Book Now on Calendly
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
                
                {/* Trust note */}
                <p className="text-warm-50 text-sm mt-6 text-center">
                  30-minute call · No commitment · Expert Amazon strategies
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}