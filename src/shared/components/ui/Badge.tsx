import { memo, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
  success: 'bg-success-600/10 text-success-600 dark:bg-success-600/20 dark:text-success-500',
  warning: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
  danger: 'bg-danger-600/10 text-danger-600 dark:bg-danger-600/20 dark:text-danger-500',
  info: 'bg-brand-600/10 text-brand-600 dark:bg-brand-600/20 dark:text-brand-500',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-3 py-1 text-[10px]',
};

export const Badge = memo(function Badge({
  variant = 'default',
  size = 'md',
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-black uppercase tracking-widest',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
    >
      {children}
    </span>
  );
});

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_MAP: Record<string, BadgeVariant> = {
  pending: 'warning',
  activo: 'success',
  active: 'success',
  completed: 'success',
  delivered: 'success',
  paid: 'success',
  cancelled: 'danger',
  cancelled店内: 'danger',
  failed: 'danger',
  overdue: 'danger',
  draft: 'default',
  in_progress: 'info',
  processing: 'info',
  sent: 'info',
};

export const StatusBadge = memo(function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant = STATUS_MAP[status?.toLowerCase()] || 'default';
  return (
    <Badge variant={variant} size="sm" className={className}>
      {status}
    </Badge>
  );
});
