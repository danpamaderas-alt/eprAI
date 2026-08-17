import { cn } from '../../utils/cn';

interface SpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-[3px]',
};

export function Spinner({ className, size = 'md' }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className={cn(
        'border-current border-t-transparent rounded-full animate-spin',
        sizeStyles[size],
        className,
      )}
    />
  );
}
