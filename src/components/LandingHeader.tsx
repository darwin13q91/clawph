/**
 * LandingHeader — sticky top navigation for ClawPH landing page.
 * Mobile-first with hamburger on small screens, inline links on desktop.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Bot } from 'lucide-react';

interface LandingHeaderProps {
  onCtaClick?: () => void;
}

export default function LandingHeader({ onCtaClick }: LandingHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    setMobileOpen(false);
  };

  const navLinks = [
    { label: 'How it works', id: 'how-it-works' },
    { label: 'Who it\'s for', id: 'use-cases' },
    { label: 'Why ClawPH', id: 'why-clawph' },
    { label: 'Pricing', id: 'pricing' },
    { label: 'FAQ', id: 'faq' },
  ];

  return (
    <>
      {/* Sticky header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-jungle/90 backdrop-blur-md border-b border-warm/10">
        <div className="container-base">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <button
              onClick={() => scrollTo('hero')}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              aria-label="Go to top"
            >
              <div className="w-8 h-8 rounded-lg bg-neon-500 flex items-center justify-center">
                <Bot size={18} className="text-jungle-900" />
              </div>
              <span className="font-display font-black text-warm text-lg tracking-tight">
                Claw<span className="text-neon-500">PH</span>
              </span>
            </button>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  className="text-warm-400 hover:text-warm text-sm font-medium transition-colors"
                >
                  {link.label}
                </button>
              ))}
            </nav>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={onCtaClick}
                className="btn btn-primary text-sm px-5"
              >
                Get Started
              </button>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-warm-400 hover:text-warm transition-colors"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed top-16 left-0 right-0 z-40 bg-jungle/95 backdrop-blur-md border-b border-warm/10 md:hidden"
          >
            <nav className="container-base py-4 flex flex-col gap-1" aria-label="Mobile navigation">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  className="text-warm-400 hover:text-warm text-base font-medium py-3 px-2 text-left hover:bg-warm/5 rounded-lg transition-colors"
                >
                  {link.label}
                </button>
              ))}
              <div className="pt-3 border-t border-warm/10 mt-2">
                <button
                  onClick={() => { scrollTo('pricing'); setMobileOpen(false); }}
                  className="btn btn-primary w-full justify-center"
                >
                  Get Started
                </button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
