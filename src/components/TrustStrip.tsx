/**
 * TrustStrip — compact trust signals row for the hero section.
 * Shows: supported channels, payment methods, guarantee, and setup ownership.
 */
import { Bot, ShieldCheck, Smartphone, CreditCard, Landmark, QrCode, Check, MessageCircle } from 'lucide-react';

interface TrustStripProps {
  variant?: 'hero' | 'footer';
}

export default function TrustStrip({ variant = 'hero' }: TrustStripProps) {
  const channels = [
    { icon: MessageCircle, label: 'Telegram' },
    { icon: MessageCircle, label: 'WhatsApp' },
    { icon: Bot, label: 'Discord' },
  ];

  const payments = [
    { icon: Smartphone, label: 'GCash' },
    { icon: Smartphone, label: 'Maya' },
    { icon: QrCode, label: 'QRPH' },
    { icon: CreditCard, label: 'Card' },
    { icon: Landmark, label: 'Bank' },
  ];

  const trust = [
    { icon: ShieldCheck, label: '30-day guarantee' },
    { icon: Check, label: 'You own your infra' },
    { icon: Check, label: 'Cancel anytime' },
  ];

  if (variant === 'footer') {
    return (
      <div className="flex flex-wrap items-center justify-center gap-6 text-warm-400 text-sm">
        {trust.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <item.icon size={14} className="text-neon-500" />
            {item.label}
          </span>
        ))}
      </div>
    );
  }

  // Hero variant — compact rows
  return (
    <div className="space-y-3">
      {/* Channels */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <span className="text-warm-400 text-xs">Channels:</span>
        {channels.map((ch) => (
          <span key={ch.label} className="inline-flex items-center gap-1 text-warm text-xs font-medium bg-warm/5 border border-warm/10 rounded-full px-2.5 py-1">
            <ch.icon size={11} />
            {ch.label}
          </span>
        ))}
      </div>

      {/* Payments */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <span className="text-warm-400 text-xs">Payments:</span>
        {payments.map((pm) => (
          <span key={pm.label} className="inline-flex items-center gap-1 text-warm text-xs font-medium bg-warm/5 border border-warm/10 rounded-full px-2.5 py-1">
            <pm.icon size={11} />
            {pm.label}
          </span>
        ))}
      </div>

      {/* Trust */}
      <div className="flex items-center justify-center gap-4 flex-wrap">
        {trust.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5 text-warm-400 text-xs">
            <item.icon size={13} className="text-neon-500" />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
