import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowUpRight, Mail, MapPin, Phone, Linkedin, Twitter, MessageCircle, Bot, Users, FileText, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import AnimatedLogo from './AnimatedLogo';
import CalendlyButton from './CalendlyButton';

interface FooterLink {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  isExternal?: boolean;
}

interface FooterLinkGroup {
  title: string;
  links: FooterLink[];
}

const footerLinks: FooterLinkGroup[] = [
  {
    title: 'Services',
    links: [
      { label: 'OpenClaw Setup', href: '/#pricing', icon: Bot },
      { label: 'Growth Plan', href: '/#pricing', icon: Users },
      { label: 'Telegram Integration', href: '/#pricing', icon: MessageCircle },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', href: '/about', icon: Users },
      { label: 'How It Works', href: '/#process', icon: ArrowUpRight },
      { label: 'FAQ', href: '/#faq', icon: FileText },
      { label: 'Contact', href: '/#contact', icon: Mail },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Compliance', href: '/compliance.html', icon: Shield, isExternal: true },
      { label: 'Privacy Policy', href: '/privacy.html', icon: FileText, isExternal: true },
      { label: 'Terms of Service', href: '/terms.html', icon: FileText, isExternal: true },
    ],
  },
];

const contactInfo = [
  {
    icon: Mail,
    label: 'Email us',
    value: 'hello@clawph.com',
    href: 'mailto:hello@clawph.com',
  },
  {
    icon: Phone,
    label: 'Call or text',
    value: '+63 0995 450 5206',
    href: 'tel:+6309954505206',
  },
  {
    icon: MapPin,
    label: 'Based in',
    value: 'Philippines • Remote worldwide',
    href: null,
  },
];

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

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-50 bg-jungle-900 border-t border-warm/10">
      {/* Main Footer Content */}
      <div className="container-base py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8">
          {/* Brand Column */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-4"
          >
            <Link 
              to="/" 
              className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-500 focus-visible:ring-offset-2 focus-visible:ring-offset-jungle-900 rounded-lg w-fit"
              aria-label="ClawPH - Home"
            >
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="transition-transform"
              >
                <AnimatedLogo size={40} />
              </motion.div>
              <span className="font-display text-2xl font-bold text-warm tracking-tight">
                ClawPH
              </span>
            </Link>

            <p className="text-warm-400 leading-relaxed mt-6 mb-8 max-w-sm">
              OpenClaw setup and support for Philippine businesses. Deploy your own 24/7 AI assistant on Telegram, Discord, or WhatsApp.
            </p>

            {/* Contact Info */}
            <div className="space-y-4">
              {contactInfo.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  {item.href ? (
                    <a
                      href={item.href}
                      className="flex items-center gap-3 text-warm-400 hover:text-neon transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-500 focus-visible:ring-offset-2 focus-visible:ring-offset-jungle-900 rounded-lg"
                    >
                      <div className="w-10 h-10 rounded-xl bg-neon/10 border border-neon/20 flex items-center justify-center group-hover:bg-neon/20 transition-colors">
                        <item.icon size={16} className="text-neon" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-warm-400 text-xs">{item.label}</p>
                        <p className="text-warm text-sm font-medium">{item.value}</p>
                      </div>
                    </a>
                  ) : (
                    <div className="flex items-center gap-3 text-warm-400">
                      <div className="w-10 h-10 rounded-xl bg-neon/10 border border-neon/20 flex items-center justify-center">
                        <item.icon size={16} className="text-neon" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-warm-400 text-xs">{item.label}</p>
                        <p className="text-warm text-sm font-medium">{item.value}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Social Links */}
            <div className="mt-6 pt-6 border-t border-warm/10">
              <p className="text-warm-400 text-xs uppercase tracking-wide mb-3">Follow Us</p>
              <div className="flex items-center gap-3">
                <a
                  href="https://linkedin.com/in/amznby-services/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-warm/5 border border-warm/10 flex items-center justify-center text-warm-400 hover:text-neon hover:bg-neon/10 hover:border-neon/30 transition-all"
                  aria-label="LinkedIn"
                >
                  <Linkedin size={18} aria-hidden="true" />
                </a>
                <a
                  href="https://www.facebook.com/amznbyServices"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-warm/5 border border-warm/10 flex items-center justify-center text-warm-400 hover:text-neon hover:bg-neon/10 hover:border-neon/30 transition-all"
                  aria-label="Facebook"
                >
                  <Twitter size={18} aria-hidden="true" />
                </a>
                <a
                  href="https://telegram.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-warm/5 border border-warm/10 flex items-center justify-center text-warm-400 hover:text-neon hover:bg-neon/10 hover:border-neon/30 transition-all"
                  aria-label="Telegram"
                >
                  <MessageCircle size={18} aria-hidden="true" />
                </a>
              </div>
            </div>
          </motion.div>

          {/* Links Columns */}
          <div className="lg:col-span-5 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {footerLinks.map((group, groupIndex) => (
              <motion.div 
                key={group.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: groupIndex * 0.1 }}
              >
                <h4 className="font-display text-sm font-bold text-warm uppercase tracking-wider mb-5">
                  {group.title}
                </h4>
                <ul className="space-y-3">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      {link.isExternal ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-warm-400 hover:text-neon text-sm transition-colors inline-flex items-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-500 focus-visible:ring-offset-2 focus-visible:ring-offset-jungle-900 rounded px-1 -mx-1"
                        >
                          <link.icon size={14} className="text-warm-500 group-hover:text-neon transition-colors" aria-hidden="true" />
                          <span>{link.label}</span>
                          <ArrowUpRight size={12} className="opacity-50 group-hover:opacity-100" aria-hidden="true" />
                        </a>
                      ) : link.href.startsWith('/#') ? (
                        <HashLink
                          to={link.href}
                          className="text-warm-400 hover:text-neon text-sm transition-colors inline-flex items-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-500 focus-visible:ring-offset-2 focus-visible:ring-offset-jungle-900 rounded px-1 -mx-1"
                        >
                          <link.icon size={14} className="text-warm-500 group-hover:text-neon transition-colors" aria-hidden="true" />
                          <span>{link.label}</span>
                        </HashLink>
                      ) : (
                        <Link
                          to={link.href}
                          className="text-warm-400 hover:text-neon text-sm transition-colors inline-flex items-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-500 focus-visible:ring-offset-2 focus-visible:ring-offset-jungle-900 rounded px-1 -mx-1"
                        >
                          <link.icon size={14} className="text-warm-500 group-hover:text-neon transition-colors" aria-hidden="true" />
                          <span>{link.label}</span>
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          {/* CTA Column */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="lg:col-span-3"
          >
            <h4 className="font-display text-sm font-bold text-warm uppercase tracking-wider mb-5">
              Get Started
            </h4>
            <div className="space-y-4">
              <CalendlyButton className="w-full justify-center">
                Book a Call
              </CalendlyButton>

              <p className="text-warm-400 text-xs text-center leading-relaxed">
                Free 30-min consultation
                <br />
                No commitment required
              </p>
            </div>

            {/* Trust Badge */}
            <div className="mt-8 p-4 rounded-2xl bg-warm/5 border border-warm/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neon/10 flex items-center justify-center flex-shrink-0">
                  <Bot size={20} className="text-neon" />
                </div>
                <div>
                  <p className="text-warm text-sm font-medium">Powered by OpenClaw</p>
                  <p className="text-warm-400 text-xs">Claude, GPT, Gemini & more</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-warm/10">
        <div className="container-base py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Copyright */}
            <p className="text-warm-400 text-sm">
              © {currentYear} ClawPH. All rights reserved.
            </p>

            {/* Badges */}
            <div className="flex items-center gap-4 text-warm-400 text-xs">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-neon animate-pulse" aria-hidden="true" />
                All systems operational
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
