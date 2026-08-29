import { type ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../utils/cn';

interface KpiCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  trend?: number;
  variant?: 'default' | 'dark' | 'emerald' | 'amber' | 'rose' | 'brand';
  className?: string;
}

const variants = {
  default: 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700',
  dark: 'bg-slate-950 border-slate-800',
  emerald: 'bg-success-50 border-success-500/20',
  amber: 'bg-amber-500/5 border-amber-500/20',
  rose: 'bg-danger-50 border-danger-500/20',
  brand: 'bg-brand-50 border-brand-500/20',
};

export function KpiCard({ label, value, icon, trend, variant = 'default', className }: KpiCardProps) {
  return (
    <div
      className={cn(
        'p-8 rounded-[2.5rem] border shadow-sm relative overflow-hidden group transition-colors',
        variants[variant],
        className,
      )}
    >
      <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1">{label}</p>
      <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums flex items-center gap-3">
        {value}
        {trend !== undefined && (
          <span
            className={cn(
              'flex items-center text-xs font-black',
              trend >= 0 ? 'text-emerald-500' : 'text-rose-500',
            )}
            title={trend >= 0 ? `+${trend}% vs mes anterior` : `${trend}% vs mes anterior`}
          >
            {trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {Math.abs(trend)}%
          </span>
        )}
      </p>
      {icon && (
        <div className="absolute -right-2 -bottom-2 text-6xl opacity-5 grayscale group-hover:grayscale-0 transition-colors" aria-hidden="true">
          {icon}
        </div>
      )}
    </div>
  );
}
