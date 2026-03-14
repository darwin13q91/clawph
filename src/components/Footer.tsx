import { Link, useNavigate, useLocation } from 'react-router-dom';
import AnimatedLogo from './AnimatedLogo';

function HashLink({ to, children, className }: { to: string; children: React.ReactNode; className?: string }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const hash = to.replace('/', '');
    if (pathname === '/') {
      // Already on home page — just scroll
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else {
      // Navigate to home, ScrollToTop will handle the hash scroll
      navigate(to);
    }
  };

  return (
    <a href={to} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}

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
            <HashLink to="/#demo" className="text-warm-72 hover:text-warm transition-colors text-sm">
              Demo
            </HashLink>
            <HashLink to="/#pricing" className="text-warm-72 hover:text-warm transition-colors text-sm">
              Pricing
            </HashLink>
            <HashLink to="/#faq" className="text-warm-72 hover:text-warm transition-colors text-sm">
              FAQ
            </HashLink>
            <a href="/compliance.html" className="text-warm-72 hover:text-warm transition-colors text-sm">
              Compliance
            </a>
            <HashLink to="/#contact" className="text-warm-72 hover:text-warm transition-colors text-sm">
              Contact
            </HashLink>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-warm/10 flex flex-col md:flex-row items-center justify-center gap-4">
          <p className="text-warm-72 text-sm">
            © {currentYear} amajungle. All rights reserved.
          </p>
        </div>

        {/* River AI Technology Badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-warm-72 text-xs">
          <span className="text-lg">🌊</span>
          <span>Powered by River AI Technology</span>
          <span className="text-warm/30">|</span>
          <span>23 specialized Amazon intelligence modes</span>
          <span className="text-warm/30">|</span>
          <span>Compliance-first recommendations</span>
        </div>
      </div>
    </footer>
  );
}
