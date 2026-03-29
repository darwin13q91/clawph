import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import CalendlyButton from './CalendlyButton';

export default function StickyCTA() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const heroRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Find the hero section
    heroRef.current = document.getElementById('hero');

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show sticky CTA when hero scrolls out of view (not visible)
        setShow(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    if (heroRef.current) {
      observer.observe(heroRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Also keep scroll-based fallback for when IntersectionObserver doesn't fire
  useEffect(() => {
    const handleScroll = () => {
      if (!heroRef.current) {
        // Fallback: show after scrolling past ~80vh
        setShow(window.scrollY > window.innerHeight * 0.8);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!show || dismissed) return null;

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-200 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
      <div className="relative bg-jungle/95 backdrop-blur-lg border-t border-neon/20 p-4 pb-[calc(16px+env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 text-warm/60 hover:text-warm p-1"
          aria-label="Dismiss"
        >
          <X size={16} aria-hidden="true" />
        </button>
        <CalendlyButton className="w-full justify-center btn-primary" showIcon={true}>
          Book Free Strategy Call →
        </CalendlyButton>
        <p className="text-center text-warm/60 text-xs mt-2">
          Reply within 1 hour • No commitment
        </p>
      </div>
    </div>
  );
}
