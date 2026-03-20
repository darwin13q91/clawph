import { useEffect, useState } from 'react';
import { Menu, X, ChevronRight } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import CalendlyButton from './CalendlyButton';
import AnimatedLogo from './AnimatedLogo';

const navItems = [
  { label: 'Free Audit', href: '#audit' },
  { label: 'See Demo', href: '#demo' },
  { label: 'How It Works', href: '#process' },
  { label: 'Pricing', href: '#pricing' },
];

// Mobile menu animation variants
const menuVariants = {
  closed: {
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: [0.22, 1, 0.36, 1] as const,
      when: 'afterChildren',
    },
  },
  open: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1] as const,
      when: 'beforeChildren',
      staggerChildren: 0.08,
    },
  },
};

const menuItemVariants = {
  closed: {
    y: 20,
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
  open: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const isHomePage = location.pathname === '/';

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
      
      // Update active section based on scroll position
      if (isHomePage) {
        const sections = ['audit', 'demo', 'process', 'pricing', 'faq', 'contact'];
        for (const section of sections) {
          const element = document.getElementById(section);
          if (element) {
            const rect = element.getBoundingClientRect();
            if (rect.top <= 150 && rect.bottom >= 150) {
              setActiveSection(section);
              break;
            }
          }
        }
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHomePage]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const scrollToSection = (id: string) => {
    if (!isHomePage) {
      // Navigate to home page first, then scroll
      navigate('/');
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Skip to content link for accessibility */}
      <a
        href="#main-content"
        className="skip-link"
      >
        Skip to main content
      </a>

      {/* Navigation Bar */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? 'bg-jungle/95 backdrop-blur-xl shadow-lg shadow-black/10 py-3'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="w-full px-4 sm:px-6 lg:px-12 flex items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 sm:gap-3 group"
          >
            <div className="transition-transform duration-300 group-hover:scale-105">
              <AnimatedLogo size={36} />
            </div>
            <span className="font-display text-xl sm:text-2xl font-bold text-warm tracking-tight hidden sm:block">
              amajungle
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = activeSection === item.href.replace('#', '');
              return (
                <button
                  key={item.label}
                  onClick={() => scrollToSection(item.href.replace('#', ''))}
                  className={`nav-link px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                    isActive 
                      ? 'text-warm bg-warm/10' 
                      : 'text-warm-72 hover:text-warm hover:bg-warm/5'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
            <Link
              to="/about"
              className={`nav-link px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ml-1 ${
                location.pathname === '/about'
                  ? 'text-warm bg-warm/10'
                  : 'text-warm-72 hover:text-warm hover:bg-warm/5'
              }`}
            >
              About
            </Link>
          </div>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-3">
            <CalendlyButton className="btn-sm">
              Book a Call
            </CalendlyButton>
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden relative w-10 h-10 rounded-xl bg-warm/5 flex items-center justify-center text-warm hover:bg-warm/10 transition-colors"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
          >
            <AnimatePresence mode="wait">
              {isMobileMenuOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <X size={20} />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Menu size={20} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            variants={menuVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="fixed inset-0 z-40 lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation menu"
          >
            {/* Backdrop */}
            <motion.div 
              className="absolute inset-0 bg-jungle/98 backdrop-blur-2xl"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            
            {/* Menu Content */}
            <div className="relative h-full flex flex-col pt-24 pb-8 px-6">
              {/* Navigation Links */}
              <div className="flex-1 flex flex-col justify-center gap-2">
                {navItems.map((item) => (
                  <motion.button
                    key={item.label}
                    variants={menuItemVariants}
                    onClick={() => scrollToSection(item.href.replace('#', ''))}
                    className="flex items-center justify-between w-full p-4 rounded-2xl text-left text-warm text-xl font-display font-bold hover:bg-warm/5 transition-colors group"
                  >
                    <span>{item.label}</span>
                    <ChevronRight 
                      size={20} 
                      className="text-warm-50 group-hover:text-neon group-hover:translate-x-1 transition-all" 
                    />
                  </motion.button>
                ))}
                
                <motion.div variants={menuItemVariants}>
                  <Link
                    to="/about"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-between w-full p-4 rounded-2xl text-left text-warm text-xl font-display font-bold hover:bg-warm/5 transition-colors group"
                  >
                    <span>About</span>
                    <ChevronRight 
                      size={20} 
                      className="text-warm-50 group-hover:text-neon group-hover:translate-x-1 transition-all" 
                    />
                  </Link>
                </motion.div>
              </div>

              {/* Bottom CTA */}
              <motion.div 
                variants={menuItemVariants}
                className="pt-6 border-t border-warm/10"
              >
                <CalendlyButton className="w-full justify-center">
                  Book Free Strategy Call
                </CalendlyButton>
                
                <p className="text-center text-warm-50 text-sm mt-4">
                  Free 30-minute consultation • No commitment
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}