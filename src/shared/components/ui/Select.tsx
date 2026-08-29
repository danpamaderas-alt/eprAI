import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, placeholder, error, className, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div>
        {label && (
          <label
            htmlFor={selectId}
            className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 block mb-1"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'w-full appearance-none rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 text-xs text-slate-900 dark:text-white transition-colors',
              'focus-visible:ring-2 focus-visible:ring-brand-600/40 focus:border-brand-600',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-danger-600 focus:ring-danger-600/40 focus:border-danger-600',
              className,
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
        {error && (
          <p className="text-[10px] text-danger-600 mt-1 ml-1">{error}</p>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';
