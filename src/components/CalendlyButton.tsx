import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, X } from 'lucide-react';

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
              className="relative flex flex-col w-full max-w-5xl h-[90vh] bg-white rounded-3xl overflow-hidden shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label="Schedule a strategy call with amajungle"
            >
              {/* Close button overlay */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(false)}
                aria-label="Close scheduling dialog"
                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-xl bg-warm/10 backdrop-blur-sm flex items-center justify-center text-warm hover:bg-warm/20 transition-colors duration-300"
              >
                <X size={20} />
              </motion.button>
              
              {/* Calendly Inline Widget */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                <iframe
                  src="https://calendly.com/ops-amajungle/30min?embed_type=Inline&hide_landing_page_details=1&hide_gdpr_banner=1&background_color=ffffff&text_color=1a1a2e&primary_color=00AA5B"
                  className="w-full h-[600px] block bg-white"
                  title="Schedule a call with amajungle"
                  style={{ border: 'none' }}
                  loading="lazy"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
