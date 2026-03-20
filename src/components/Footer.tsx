import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowUpRight, Mail, MapPin, Phone } from 'lucide-react';
import AnimatedLogo from './AnimatedLogo';
import CalendlyButton from './CalendlyButton';

function HashLink({ to, children, className }: { to: string; children: React.ReactNode; className?: string }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const hash = to.replace('/', '');
    if (pathname === '/') {
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate(to);
    }
  };

  return (
    <a href={to} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}

const footerLinks = {
  services: [
    { label: 'River AI Intelligence', href: '/#pricing' },
    { label: 'Amazon Growth', href: '/#pricing' },
    { label: 'Brand Websites', href: '/#pricing' },
    { label: 'Free Audit', href: '/#audit' },
  ],
  company: [
    { label: 'About Us', href: '/about' },
    { label: 'How It Works', href: '/#process' },
    { label: 'FAQ', href: '/#faq' },
    { label: 'Contact', href: '/#contact' },
  ],
  legal: [
    { label: 'Compliance', href: '/compliance.html' },
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
  ],
};

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-50 bg-jungle-dark border-t border-warm/10">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-4">
            <Link to="/" className="flex items-center gap-3 group mb-6">
              <div className="transition-transform duration-300 group-hover:scale-105">
                <AnimatedLogo size={40} />
              </div>
              <span className="font-display text-2xl font-bold text-warm tracking-tight">
                amajungle
              </span>
            </Link>

            <p className="text-warm-72 leading-relaxed mb-6 max-w-sm">
              AI-powered Amazon intelligence and management for sellers who want to
              scale without drowning in busywork.
            </p>

            {/* Contact Info */}
            <div className="space-y-3">
              <a
                href="mailto:hello@amajungle.com"
                className="flex items-center gap-3 text-warm/70 hover:text-neon transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-neon/10 border border-neon/20 flex items-center justify-center group-hover:bg-neon/20 transition-colors">
                  <Mail size={14} className="text-neon" />
                </div>
                <span className="text-sm">hello@amajungle.com</span>
              </a>
              
              <a
                href="tel:+6309954505206"
                className="flex items-center gap-3 text-warm/70 hover:text-neon transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-neon/10 border border-neon/20 flex items-center justify-center group-hover:bg-neon/20 transition-colors">
                  <Phone size={14} className="text-neon" />
                </div>
                <span className="text-sm">+63 0995 450 5206</span>
              </a>
              
              <div className="flex items-center gap-3 text-warm/70">
                <div className="w-9 h-9 rounded-lg bg-neon/10 border border-neon/20 flex items-center justify-center">
                  <MapPin size={14} className="text-neon" />
                </div>
                <span className="text-sm">Philippines • Remote worldwide</span>
              </div>
            </div>
          </div>

          {/* Links Columns */}
          <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {/* Services */}
            <div>
              <h4 className="font-display text-sm font-bold text-warm uppercase tracking-wider mb-4">
                Services
              </h4>
              <ul className="space-y-3">
                {footerLinks.services.map((link) => (
                  <li key={link.label}>
                    <HashLink
                      to={link.href}
                      className="text-warm-72 hover:text-neon text-sm transition-colors inline-flex items-center gap-1 group"
                    >
                      {link.label}
                    </HashLink>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-display text-sm font-bold text-warm uppercase tracking-wider mb-4">
                Company
              </h4>
              <ul className="space-y-3">
                {footerLinks.company.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith('/#') ? (
                      <HashLink
                        to={link.href}
                        className="text-warm-72 hover:text-neon text-sm transition-colors inline-flex items-center gap-1 group"
                      >
                        {link.label}
                      </HashLink>
                    ) : (
                      <Link
                        to={link.href}
                        className="text-warm-72 hover:text-neon text-sm transition-colors inline-flex items-center gap-1 group"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-display text-sm font-bold text-warm uppercase tracking-wider mb-4">
                Legal
              </h4>
              <ul className="space-y-3">
                {footerLinks.legal.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-warm-72 hover:text-neon text-sm transition-colors inline-flex items-center gap-1 group"
                    >
                      {link.label}
                      {link.href !== '#' && <ArrowUpRight size={12} className="opacity-50" />}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* CTA Column */}
          <div className="lg:col-span-2">
            <h4 className="font-display text-sm font-bold text-warm uppercase tracking-wider mb-4">
              Get Started
            </h4>
            <div className="space-y-3">
              <CalendlyButton className="w-full justify-center text-sm">
                Book a Call
              </CalendlyButton>

              <p className="text-warm-50 text-xs text-center">
                Free 30-min consultation
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-warm/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Copyright */}
            <p className="text-warm-50 text-sm">
              © {currentYear} amajungle. All rights reserved.
            </p>

            {/* River AI Badge */}
            <div className="flex items-center gap-2 text-warm-50 text-xs">
              <span className="text-lg">🌊</span>
              <span>Powered by River AI Technology</span>
              <span className="text-warm/30">|</span>
              <span>23 specialized Amazon intelligence modes</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}