import { memo, useMemo } from 'react';
import { Check, Banknote, ArrowRightLeft, BookOpen, CreditCard, Smartphone, Wallet, CircleDollarSign } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

interface PaymentMethod {
  id: string;
  name: string;
}

interface PaymentSelectorProps {
  methods: PaymentMethod[];
  value: string;
  onChange: (methodId: string) => void;
}

const ICON_KEYWORDS: Record<string, typeof Banknote> = {
  efectivo: Banknote,
  cash: Banknote,
  transferencia: ArrowRightLeft,
  transfer: ArrowRightLeft,
  cuenta: BookOpen,
  ctacte: BookOpen,
  corriente: BookOpen,
  tarjeta: CreditCard,
  card: CreditCard,
  debito: CreditCard,
  credito: CreditCard,
  qr: Smartphone,
  mobile: Smartphone,
  billetera: Wallet,
  wallet: Wallet,
};

const COLOR_KEYWORDS: Record<string, string> = {
  efectivo: 'success',
  cash: 'success',
  transferencia: 'brand',
  transfer: 'brand',
  cuenta: 'amber',
  ctacte: 'amber',
  corriente: 'amber',
  tarjeta: 'indigo',
  card: 'indigo',
  debito: 'indigo',
  credito: 'violet',
  qr: 'teal',
  billetera: 'emerald',
  wallet: 'emerald',
};

const COLOR_MAP: Record<string, string> = {
  success: 'bg-success/10 text-success border-success/30 ring-success/20',
  brand: 'bg-brand/10 text-brand border-brand/30 ring-brand/20',
  amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-300/30 ring-amber-300/20',
  indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-300/30 ring-indigo-300/20',
  violet: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border-violet-300/30 ring-violet-300/20',
  teal: 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 border-teal-300/30 ring-teal-300/20',
  emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-300/30 ring-emerald-300/20',
};

const ACTIVE_COLOR_MAP: Record<string, string> = {
  success: 'bg-success text-white border-success shadow-lg shadow-success/20',
  brand: 'bg-brand text-white border-brand shadow-lg shadow-brand/20',
  amber: 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20',
  indigo: 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20',
  violet: 'bg-violet-500 text-white border-violet-500 shadow-lg shadow-violet-500/20',
  teal: 'bg-teal-500 text-white border-teal-500 shadow-lg shadow-teal-500/20',
  emerald: 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20',
};

function resolveMethod(method: PaymentMethod) {
  const lower = method.name.toLowerCase().replace(/[_\s]+/g, '');
  let iconKey = 'default';
  let colorKey = 'brand';
  for (const [kw, icon] of Object.entries(ICON_KEYWORDS)) {
    if (lower.includes(kw)) { iconKey = kw; break; }
  }
  for (const [kw, color] of Object.entries(COLOR_KEYWORDS)) {
    if (lower.includes(kw)) { colorKey = color; break; }
  }
  return {
    Icon: ICON_KEYWORDS[iconKey] || CircleDollarSign,
    color: colorKey,
  };
}

export const PaymentSelector = memo(({ methods, value, onChange }: PaymentSelectorProps) => {
  const resolved = useMemo(
    () => methods.map(m => ({ ...m, ...resolveMethod(m) })),
    [methods]
  );

  return (
    <div className="grid grid-cols-3 gap-2">
      {resolved.map(m => {
        const active = value === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            className={cn(
              'relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all active:scale-95',
              active
                ? ACTIVE_COLOR_MAP[m.color]
                : cn('bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-300 dark:hover:border-slate-600')
            )}
          >
            {active && (
              <div className="absolute top-1 right-1">
                <Check className="w-3 h-3" />
              </div>
            )}
            <m.Icon className={cn('w-4 h-4', active ? 'text-white' : '')} />
            <span className="text-[8px] font-black uppercase tracking-wider leading-none truncate w-full text-center">
              {m.name}
            </span>
          </button>
        );
      })}
    </div>
  );
});

PaymentSelector.displayName = 'PaymentSelector';
