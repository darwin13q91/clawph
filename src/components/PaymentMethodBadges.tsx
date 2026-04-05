import { CreditCard, Landmark, QrCode, Smartphone } from 'lucide-react';
import { PAYMENT_METHODS } from '../config/payments';

const methodStyles = {
  gcash: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
  maya: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  qrph: 'border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-300',
  card: 'border-warm/15 bg-warm/5 text-warm-200',
  bank_transfer: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
} as const;

function getIcon(id: (typeof PAYMENT_METHODS)[number]['id']) {
  switch (id) {
    case 'gcash':
    case 'maya':
      return Smartphone;
    case 'qrph':
      return QrCode;
    case 'bank_transfer':
      return Landmark;
    case 'card':
    default:
      return CreditCard;
  }
}

interface PaymentMethodBadgesProps {
  compact?: boolean;
  className?: string;
}

export default function PaymentMethodBadges({
  compact = false,
  className = '',
}: PaymentMethodBadgesProps) {
  return (
    <div className={`flex flex-wrap gap-2.5 ${className}`.trim()}>
      {PAYMENT_METHODS.map((method) => {
        const Icon = getIcon(method.id);
        return (
          <div
            key={method.id}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 ${methodStyles[method.id]}`}
            title={method.description}
          >
            <Icon size={compact ? 14 : 16} />
            <span className={`font-mono ${compact ? 'text-xs' : 'text-sm'} font-semibold tracking-wide`}>
              {compact ? method.shortLabel : method.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
