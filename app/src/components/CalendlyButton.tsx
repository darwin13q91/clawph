import { useState } from 'react';
import { Calendar, X } from 'lucide-react';

interface CalendlyButtonProps {
  children?: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary';
}

export default function CalendlyButton({ 
  children = 'Book a call', 
  className = '',
  variant = 'primary'
}: CalendlyButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const buttonClass = variant === 'primary' 
    ? 'btn-primary' 
    : 'btn-secondary';

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`${buttonClass} flex items-center gap-2 ${className}`}
      >
        <Calendar size={18} />
        {children}
      </button>

      {/* Calendly Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-jungle/95 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Modal */}
          <div className="relative w-full max-w-4xl h-[80vh] bg-jungle rounded-3xl overflow-hidden shadow-2xl border border-warm/10">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-warm/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neon/20 flex items-center justify-center">
                  <Calendar className="text-neon" size={20} />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-warm">Book Your Strategy Call</h3>
                  <p className="text-warm-72 text-sm">Free 30-minute consultation</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 rounded-full bg-warm/5 flex items-center justify-center text-warm-72 hover:bg-warm/10 hover:text-warm transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Calendly Inline Widget */}
            <div className="w-full h-[calc(80vh-80px)]">
              <iframe
                src="https://calendly.com/amajungle/strategy-call?embed_type=Inline&hide_landing_page_details=1&hide_gdpr_banner=1"
                width="100%"
                height="100%"
                frameBorder="0"
                title="Schedule a call with amajungle"
                className="bg-jungle"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
