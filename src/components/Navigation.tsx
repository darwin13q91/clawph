import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import CalendlyButton from './CalendlyButton';
import AnimatedLogo from './AnimatedLogo';

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Skip to content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[60] bg-neon text-jungle px-4 py-2 rounded-lg font-semibold"
      >
        Skip to main content
      </a>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? 'bg-jungle/90 backdrop-blur-md py-4'
            : 'bg-transparent py-6'
        }`}
      >
        <div className="w-full px-6 lg:px-12 flex items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-3"
          >
            <AnimatedLogo size={40} />
            <span className="font-display text-2xl font-bold text-warm tracking-tight hidden sm:block">
              amajungle
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollToSection('audit')}
              className="text-warm-72 hover:text-warm transition-colors duration-300 text-sm font-medium"
            >
              Free Audit
            </button>
            <button
              onClick={() => scrollToSection('demo')}
              className="text-warm-72 hover:text-warm transition-colors duration-300 text-sm font-medium"
            >
              See Demo
            </button>
            <button
              onClick={() => scrollToSection('process')}
              className="text-warm-72 hover:text-warm transition-colors duration-300 text-sm font-medium"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('pricing')}
              className="text-warm-72 hover:text-warm transition-colors duration-300 text-sm font-medium"
            >
              Pricing
            </button>
            <Link
              to="/about"
              className="text-warm-72 hover:text-warm transition-colors duration-300 text-sm font-medium"
            >
              About
            </Link>
            <CalendlyButton className="text-sm py-3 px-6">
              Book a Call
            </CalendlyButton>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-warm"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div
        className={`fixed inset-0 z-40 bg-jungle/98 backdrop-blur-lg transition-all duration-300 md:hidden ${
          isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation menu"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setIsMobileMenuOpen(false);
          }
        }}
      >
        <div className="flex flex-col items-center justify-center h-full gap-6 pt-20">
          <button
            onClick={() => scrollToSection('audit')}
            className="text-warm text-xl font-display font-bold py-3 px-6 rounded-xl hover:bg-warm/10 transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-neon focus-visible:outline-offset-2"
          >
            Free Audit
          </button>
          <button
            onClick={() => scrollToSection('demo')}
            className="text-warm text-xl font-display font-bold py-3 px-6 rounded-xl hover:bg-warm/10 transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-neon focus-visible:outline-offset-2"
          >
            See Demo
          </button>
          <button
            onClick={() => scrollToSection('process')}
            className="text-warm text-xl font-display font-bold py-3 px-6 rounded-xl hover:bg-warm/10 transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-neon focus-visible:outline-offset-2"
          >
            How It Works
          </button>
          <button
            onClick={() => scrollToSection('pricing')}
            className="text-warm text-xl font-display font-bold py-3 px-6 rounded-xl hover:bg-warm/10 transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-neon focus-visible:outline-offset-2"
          >
            Pricing
          </button>
          <Link
            to="/about"
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-warm text-xl font-display font-bold py-3 px-6 rounded-xl hover:bg-warm/10 transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-neon focus-visible:outline-offset-2"
          >
            About
          </Link>
          <div onClick={() => setIsMobileMenuOpen(false)} className="mt-4">
            <CalendlyButton>Book a Call</CalendlyButton>
          </div>
        </div>
      </div>
    </>
  );
}
