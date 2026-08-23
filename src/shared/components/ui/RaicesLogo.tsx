import { useId } from 'react';
import { Link } from 'react-router-dom';

type RaicesLogoProps = {
  size?: number;
  withText?: boolean;
  textClassName?: string;
  className?: string;
  href?: string | null;
};

export function RaicesLogo({
  size = 36,
  withText = true,
  textClassName,
  className,
  href = '/',
}: RaicesLogoProps) {
  const rawId = useId();
  const gradId = `rz-grad-${rawId.replace(/[:]/g, '')}`;

  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className="shrink-0 drop-shadow-[0_4px_12px_rgba(59,130,246,0.35)]"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="6" y1="2" x2="44" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill={`url(#${gradId})`} />
      <g
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="white"
      >
        <path d="M24 39 L24 19" fill="none" />
        <path d="M24 27 C18 25 13 20 15 13 C21 14 25 20 24 27 Z" />
        <path d="M24 23 C30 20 37 23 35 14 C29 13 24 17 24 23 Z" />
        <path d="M24 39 C21 42 17 42 14 44" fill="none" />
        <path d="M24 39 C27 42 31 42 34 44" fill="none" />
      </g>
    </svg>
  );

  const text = withText ? (
    <span
      className={
        textClassName ??
        'text-lg font-black tracking-tighter italic text-slate-800 dark:text-white'
      }
    >
      Raíces{' '}
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
        ERP
      </span>
    </span>
  ) : null;

  const inner = (
    <>
      {mark}
      {text}
    </>
  );

  const wrapperClass = `inline-flex items-center gap-2.5 ${className ?? ''}`;

  if (href) {
    return (
      <Link to={href} className={wrapperClass} aria-label="Raíces ERP">
        {inner}
      </Link>
    );
  }

  return (
    <span className={wrapperClass} aria-label="Raíces ERP">
      {inner}
    </span>
  );
}
