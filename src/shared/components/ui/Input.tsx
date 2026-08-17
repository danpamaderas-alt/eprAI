import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div>
        {label && (
          <label
            htmlFor={inputId}
            className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 block mb-1"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 transition-all',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus:border-brand-600',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              icon && 'pl-11',
              error && 'border-danger-600 focus:ring-danger-600/40 focus:border-danger-600',
              className,
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-[10px] text-danger-600 mt-1 ml-1">{error}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
