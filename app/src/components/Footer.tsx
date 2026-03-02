import { Link } from 'react-router-dom';
import AnimatedLogo from './AnimatedLogo';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-60 bg-jungle-dark py-12 border-t border-warm/10">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <AnimatedLogo size={32} />
            <span className="font-display text-2xl font-bold text-warm tracking-tight">
              amajungle
            </span>
          </Link>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-6">
            <a href="#demo" className="text-warm-72 hover:text-warm transition-colors text-sm">
              Demo
            </a>
            <a href="#pricing" className="text-warm-72 hover:text-warm transition-colors text-sm">
              Pricing
            </a>
            <a href="#faq" className="text-warm-72 hover:text-warm transition-colors text-sm">
              FAQ
            </a>
            <a href="#contact" className="text-warm-72 hover:text-warm transition-colors text-sm">
              Contact
            </a>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-warm/10 flex flex-col md:flex-row items-center justify-center gap-4">
          <p className="text-warm-72 text-sm">
            © {currentYear} amajungle. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
