import { memo } from 'react';
import { cn } from '../../../shared/utils/cn';
import { STATUS_STYLES, type PrintStatus } from '../types';

interface PrintStatusBadgeProps {
  status: string;
  className?: string;
}

const FALLBACK = STATUS_STYLES.Idea;

export const PrintStatusBadge = memo(function PrintStatusBadge({
  status,
  className,
}: PrintStatusBadgeProps) {
  const style = STATUS_STYLES[status as PrintStatus] ?? FALLBACK;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest',
        style.badge,
        className,
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', style.dot)} aria-hidden="true" />
      {status}
    </span>
  );
});