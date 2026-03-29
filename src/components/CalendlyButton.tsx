import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';

const CALENDLY_URL = 'https://calendly.com/ops-amajungle/30min?embed_domain=amajungle.com&embed_type=PopupText';

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

  const openCalendly = () => {
    // Open Calendly in a popup window - Calendly handles the UI natively
    window.open(
      CALENDLY_URL,
      'calendlyPopup',
      'width=900,height=700,scrollbars=yes,resizable=yes'
    );
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={openCalendly}
      className={getButtonClasses()}
    >
      {showIcon && <Calendar size={size === 'sm' ? 16 : 18} />}
      {children}
    </motion.button>
  );
}
