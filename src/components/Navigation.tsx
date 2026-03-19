import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import CalendlyButton from './CalendlyButton';
import AnimatedLogo from './AnimatedLogo';

// Mobile menu animation variants
const menuVariants = {
  closed: {
    x: '100%',
    transition: {
      type: 'tween' as const,
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1] as const,
      when: 'afterChildren' as const,
    },
  },
  open: {
    x: 0,
    transition: {
      type: 'tween' as const,
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1] as const,
      when: 'beforeChildren' as const,
      staggerChildren: 0.1,
    },
  },
};

const menuItemVariants = {
  closed: {
    x: 50,
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
  open: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

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
              className="nav-link text-warm-72 hover:text-warm text-sm font-medium"
            >
              Free Audit
            </button>
            <button
              onClick={() => scrollToSection('demo')}
              className="nav-link text-warm-72 hover:text-warm text-sm font-medium"
            >
              See Demo
            </button>
            <button
              onClick={() => scrollToSection('process')}
              className="nav-link text-warm-72 hover:text-warm text-sm font-medium"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('pricing')}
              className="nav-link text-warm-72 hover:text-warm text-sm font-medium"
            >
              Pricing
            </button>
            <Link
              to="/about"
              className="nav-link text-warm-72 hover:text-warm text-sm font-medium"
            >
              About
            </Link>
            <CalendlyButton className="text-sm py-3 px-6">
              Book a Call
            </CalendlyButton>
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="md:hidden text-warm"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </motion.button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            variants={menuVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="fixed inset-0 z-40 bg-jungle/98 backdrop-blur-lg md:hidden"
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
              <motion.button
                variants={menuItemVariants}
                onClick={() => scrollToSection('audit')}
                className="text-warm text-xl font-display font-bold py-3 px-6 rounded-xl hover:bg-warm/10 transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-neon focus-visible:outline-offset-2"
              >
                Free Audit
              </motion.button>
              <motion.button
                variants={menuItemVariants}
                onClick={() => scrollToSection('demo')}
                className="text-warm text-xl font-display font-bold py-3 px-6 rounded-xl hover:bg-warm/10 transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-neon focus-visible:outline-offset-2"
              >
                See Demo
              </motion.button>
              <motion.button
                variants={menuItemVariants}
                onClick={() => scrollToSection('process')}
                className="text-warm text-xl font-display font-bold py-3 px-6 rounded-xl hover:bg-warm/10 transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-neon focus-visible:outline-offset-2"
              >
                How It Works
              </motion.button>
              <motion.button
                variants={menuItemVariants}
                onClick={() => scrollToSection('pricing')}
                className="text-warm text-xl font-display font-bold py-3 px-6 rounded-xl hover:bg-warm/10 transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-neon focus-visible:outline-offset-2"
              >
                Pricing
              </motion.button>
              <motion.div variants={menuItemVariants}>
                <Link
                  to="/about"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-warm text-xl font-display font-bold py-3 px-6 rounded-xl hover:bg-warm/10 transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-neon focus-visible:outline-offset-2 block"
                >
                  About
                </Link>
              </motion.div>
              <motion.div variants={menuItemVariants} onClick={() => setIsMobileMenuOpen(false)} className="mt-4">
                <CalendlyButton>Book a Call</CalendlyButton>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
