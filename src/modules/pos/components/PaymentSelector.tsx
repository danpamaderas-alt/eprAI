import { memo } from 'react';
import { Check, Banknote, ArrowRightLeft, BookOpen } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

interface PaymentSelectorProps {
  value: string;
  onChange: (method: string) => void;
}

const METHODS = [
  { id: 'EFECTIVO', label: 'Efectivo', icon: Banknote, color: 'success' },
  { id: 'TRANSFERENCIA', label: 'Transferencia', icon: ArrowRightLeft, color: 'brand' },
  { id: 'CTA_CTE', label: 'Cta. Corriente', icon: BookOpen, color: 'amber' },
] as const;

const COLOR_MAP: Record<string, string> = {
  success: 'bg-success/10 text-success border-success/30 ring-success/20',
  brand: 'bg-brand/10 text-brand border-brand/30 ring-brand/20',
  amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-300/30 ring-amber-300/20',
};

const ACTIVE_COLOR_MAP: Record<string, string> = {
  success: 'bg-success text-white border-success shadow-lg shadow-success/20',
  brand: 'bg-brand text-white border-brand shadow-lg shadow-brand/20',
  amber: 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20',
};

export const PaymentSelector = memo(({ value, onChange }: PaymentSelectorProps) => (
  <div className="grid grid-cols-3 gap-2">
    {METHODS.map(m => {
      const active = value === m.id;
      const Icon = m.icon;
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
          <Icon className={cn('w-4 h-4', active ? 'text-white' : '')} />
          <span className="text-[8px] font-black uppercase tracking-wider leading-none">
            {m.label}
          </span>
        </button>
      );
    })}
  </div>
));

PaymentSelector.displayName = 'PaymentSelector';
