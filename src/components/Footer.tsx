import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
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

const socialLinks = [
  { 
    label: 'LinkedIn', 
    href: '#',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    )
  },
];

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
                className="flex items-center gap-3 text-warm-72 hover:text-neon transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-warm/5 flex items-center justify-center group-hover:bg-neon/10 transition-colors">
                  <Mail size={14} />
                </div>
                <span className="text-sm">hello@amajungle.com</span>
              </a>
              
              <a 
                href="tel:+6309954505206"
                className="flex items-center gap-3 text-warm-72 hover:text-neon transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-warm/5 flex items-center justify-center group-hover:bg-neon/10 transition-colors">
                  <Phone size={14} />
                </div>
                <span className="text-sm">+63 0995 450 5206</span>
              </a>
              
              <div className="flex items-center gap-3 text-warm-72">
                <div className="w-8 h-8 rounded-lg bg-warm/5 flex items-center justify-center">
                  <MapPin size={14} />
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