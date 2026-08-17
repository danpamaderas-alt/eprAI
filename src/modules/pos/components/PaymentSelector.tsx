import { memo } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { PAYMENT_METHODS } from '../../../shared/utils/status';

interface PaymentSelectorProps {
  value: string | null;
  onChange: (method: string) => void;
}

export const PaymentSelector = memo(({ value, onChange }: PaymentSelectorProps) => (
  <div className="grid grid-cols-2 gap-2 mb-6">
    {PAYMENT_METHODS.map((m) => (
      <button
        key={m}
        type="button"
        onClick={() => onChange(m)}
        className={`py-4 rounded-2xl text-[9px] font-black transition-all border-2 flex items-center justify-center ${
          value === m
            ? 'bg-blue-600 border-blue-600 text-white shadow-xl scale-[1.02]'
            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-300'
        } uppercase`}
      >
        {m.replace('_', ' ')}
        {value === m && <CheckCircle2 className="w-3 h-3 ml-1" />}
      </button>
    ))}
  </div>
));

PaymentSelector.displayName = 'PaymentSelector';
