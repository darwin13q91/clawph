import { useEffect, useState, useCallback } from 'react';
import { Menu, X, ChevronRight, Search, Eye, Workflow, Tag, Info } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import CalendlyButton from './CalendlyButton';
import AnimatedLogo from './AnimatedLogo';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  isExternal?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Free Audit', href: '#contact', icon: Search },
  { label: 'See Demo', href: '#demo', icon: Eye },
  { label: 'How It Works', href: '#process', icon: Workflow },
  { label: 'Pricing', href: '#pricing', icon: Tag },
];

// Animation variants
const menuVariants = {
  closed: {
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: [0.22, 1, 0.36, 1] as const,
      when: 'afterChildren' as const,
    },
  },
  open: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1] as const,
      when: 'beforeChildren' as const,
      staggerChildren: 0.06,
    },
  },
};

const menuItemVariants = {
  closed: {
    y: 20,
    opacity: 0,
    transition: { duration: 0.2 },
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

const backdropVariants = {
  closed: { opacity: 0 },
  open: { opacity: 1 },
};

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  
  const location = useLocation();
  const navigate = useNavigate();
  const isHomePage = location.pathname === '/';

  // Handle scroll effects
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Update scrolled state for background change
      setIsScrolled(currentScrollY > 50);
      
      // Update active section
      if (isHomePage) {
        const sections = ['demo', 'process', 'pricing', 'faq', 'contact'];
        for (const section of sections) {
          const element = document.getElementById(section);
          if (element) {
            const rect = element.getBoundingClientRect();
            if (rect.top <= 200 && rect.bottom >= 200) {
              setActiveSection(section);
              break;
            }
          }
        }
      }
    };
    
    // Initial check
    handleScroll();
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHomePage]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isMobileMenuOpen]);

  const scrollToSection = useCallback((id: string) => {
    if (!isHomePage) {
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
  }, [isHomePage, navigate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  }, [isMobileMenuOpen]);

  return (
    <>
      {/* Skip to content link */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Navigation Bar */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 gpu ${
          isScrolled
            ? 'nav-glass py-3 shadow-lg'
            : 'bg-transparent py-4'
        }`}
        style={{
          willChange: 'background-color, backdrop-filter',
          backfaceVisibility: 'hidden',
        }}
      >
        <nav 
          className="container-base flex items-center justify-between"
          aria-label="Main navigation"
        >
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 sm:gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-500 focus-visible:ring-offset-2 focus-visible:ring-offset-jungle-800 rounded-lg"
            aria-label="amajungle - Home"
          >
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="transition-transform"
            >
              <AnimatedLogo size={36} />
            </motion.div>
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
                      : 'text-warm-300 hover:text-warm hover:bg-warm/5'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
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
                  : 'text-warm-300 hover:text-warm hover:bg-warm/5'
              }`}
              aria-current={location.pathname === '/about' ? 'page' : undefined}
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
            onKeyDown={handleKeyDown}
            className="lg:hidden relative w-11 h-11 rounded-xl glass flex items-center justify-center text-warm hover:text-neon transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-500 focus-visible:ring-offset-2 focus-visible:ring-offset-jungle-800"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
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
                  <X size={20} aria-hidden="true" />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Menu size={20} aria-hidden="true" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </nav>
      </motion.header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              variants={backdropVariants}
              initial="closed"
              animate="open"
              exit="closed"
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-jungle-950/90 backdrop-blur-xl z-40 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-hidden="true"
            />
            
            {/* Menu Panel */}
            <motion.div
              id="mobile-menu"
              variants={menuVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className="fixed inset-x-0 top-0 bottom-0 z-50 lg:hidden flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile navigation menu"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-4 border-b border-warm/10">
                <Link
                  to="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2"
                >
                  <AnimatedLogo size={32} />
                  <span className="font-display text-xl font-bold text-warm">
                    amajungle
                  </span>
                </Link>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-10 h-10 rounded-xl glass flex items-center justify-center text-warm"
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Navigation Links */}
              <nav className="flex-1 flex flex-col justify-center px-4 py-8">
                <div className="space-y-2">
                  {navItems.map((item, index) => (
                    <motion.button
                      key={item.label}
                      variants={menuItemVariants}
                      onClick={() => scrollToSection(item.href.replace('#', ''))}
                      className="w-full flex items-center justify-between p-4 rounded-2xl text-left text-warm text-xl font-display font-bold hover:bg-warm/5 transition-colors group"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <span className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-neon/10 border border-neon/20 flex items-center justify-center group-hover:bg-neon/20 transition-colors">
                          <item.icon size={20} className="text-neon" aria-hidden="true" />
                        </div>
                        {item.label}
                      </span>
                      <ChevronRight 
                        size={20} 
                        className="text-warm-400 group-hover:text-neon group-hover:translate-x-1 transition-all" 
                        aria-hidden="true"
                      />
                    </motion.button>
                  ))}
                  
                  <motion.div variants={menuItemVariants}>
                    <Link
                      to="/about"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="w-full flex items-center justify-between p-4 rounded-2xl text-left text-warm text-xl font-display font-bold hover:bg-warm/5 transition-colors group"
                    >
                      <span className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-neon/10 border border-neon/20 flex items-center justify-center group-hover:bg-neon/20 transition-colors">
                          <Info size={20} className="text-neon" aria-hidden="true" />
                        </div>
                        About
                      </span>
                      <ChevronRight 
                        size={20} 
                        className="text-warm-400 group-hover:text-neon group-hover:translate-x-1 transition-all" 
                        aria-hidden="true"
                      />
                    </Link>
                  </motion.div>
                </div>
              </nav>

              {/* Bottom CTA */}
              <motion.div 
                variants={menuItemVariants}
                className="p-4 border-t border-warm/10 space-y-4"
              >
                <CalendlyButton className="w-full justify-center btn-lg">
                  Book Free Strategy Call
                </CalendlyButton>
                
                <p className="text-center text-warm-400 text-sm">
                  Free 30-minute consultation • No commitment
                </p>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
