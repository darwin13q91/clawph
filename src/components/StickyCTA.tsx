import { useState, useEffect } from 'react';
import CalendlyButton from './CalendlyButton';

export default function StickyCTA() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling past hero (approximately 600px)
      setShow(window.scrollY > 600);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!show || dismissed) return null;

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 md:hidden transition-opacity duration-150 ${show ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="relative bg-jungle/95 backdrop-blur-lg border-t border-warm/10 p-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
        <button 
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 text-warm/60 hover:text-warm p-1"
          aria-label="Dismiss"
        >
          ✕
        </button>
        <CalendlyButton className="w-full justify-center btn-primary">
          Book Free Strategy Call →
        </CalendlyButton>
        <p className="text-center text-warm/60 text-xs mt-2">
          30-min audit • No commitment
        </p>
      </div>
    </div>
  );
}
