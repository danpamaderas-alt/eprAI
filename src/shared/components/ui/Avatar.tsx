import { memo, useMemo } from 'react';
import { cn } from '../../utils/cn';

type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps {
  name: string;
  src?: string;
  size?: AvatarSize;
  className?: string;
}

const sizeStyles: Record<AvatarSize, string> = {
  sm: 'w-8 h-8 text-[10px]',
  md: 'w-10 h-10 text-xs',
  lg: 'w-14 h-14 text-sm',
};

const colorPalette = [
  'bg-brand-600 text-white',
  'bg-success-600 text-white',
  'bg-danger-600 text-white',
  'bg-amber-500 text-white',
  'bg-purple-600 text-white',
  'bg-cyan-600 text-white',
  'bg-rose-600 text-white',
  'bg-teal-600 text-white',
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const Avatar = memo(function Avatar({
  name,
  src,
  size = 'md',
  className,
}: AvatarProps) {
  const initials = useMemo(() => getInitials(name), [name]);
  const bgColor = useMemo(() => colorPalette[hashName(name) % colorPalette.length], [name]);

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-full font-black uppercase tracking-widest shrink-0',
        bgColor,
        sizeStyles[size],
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full rounded-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        initials
      )}
    </div>
  );
});
