import type { ReactNode } from 'react';
import { hoursToTime, timeToHours } from '../../../shared/utils/format';

export type RoundingStrategy = 'exact' | '990' | '999' | '900' | 'hundred';

export const ROUNDING_LABELS: Record<RoundingStrategy, string> = {
  exact: 'Exacto',
  '990': 'Terminar en .990',
  '999': 'Terminar en .999',
  '900': 'Terminar en .900',
  hundred: 'Redondear a centena',
};

export const fmt = (n: number, decimals = 2): string =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);

export const applyRounding = (v: number, strategy: RoundingStrategy): number => {
  if (v <= 0) return 0;
  switch (strategy) {
    case 'exact':
      return Math.round(v * 100) / 100;
    case '990':
      return Math.max(0.99, Math.floor(v) + 0.99);
    case '999':
      return Math.max(0.999, Math.floor(v) + 0.999);
    case '900':
      return Math.max(0.9, Math.floor(v) + 0.9);
    case 'hundred':
      return Math.max(100, Math.ceil(v / 100) * 100);
    default:
      return Math.round(v * 100) / 100;
  }
};

export const loadJSON = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

/**
 * Une defaults guardados (localStorage) con los del código.
 * skipZeroKeys: un 0 guardado nunca fue config real → prevalece el default del código.
 */
export const mergeDefaults = <T extends object>(
  base: T,
  key: string,
  defaultableKeys: readonly string[],
  skipZeroKeys: readonly string[] = [],
): T => {
  const stored = loadJSON<Partial<T>>(key);
  if (!stored) return base;
  const merged = { ...base } as Record<string, unknown>;
  for (const k of defaultableKeys) {
    const v = (stored as Record<string, unknown>)[k];
    const isZero = typeof v === 'number' && (v as number) === 0;
    if (typeof v === 'number' && Number.isFinite(v) && !(isZero && skipZeroKeys.includes(k))) {
      merged[k] = v;
    }
  }
  return merged as T;
};

// ====================================================
// UI: TARJETA DE SECCIÓN
// ====================================================
export const SectionCard = ({
  icon,
  title,
  color,
  children,
}: {
  icon: ReactNode;
  title: string;
  color: string;
  children: ReactNode;
}) => (
  <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 space-y-4">
    <div className="flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color} shrink-0`}>
        {icon}
      </div>
      <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{title}</h2>
    </div>
    {children}
  </div>
);

// ====================================================
// UI: CAMPO NUMÉRICO
// ====================================================
export const Field = ({
  id,
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = 0.01,
  hint,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  hint?: string;
}) => (
  <div className="space-y-1">
    <label htmlFor={id} className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
      {label}
      {hint && <span className="normal-case ml-1 text-slate-600">({hint})</span>}
    </label>
    <div className="relative">
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm select-none">
          {prefix}
        </span>
      )}
      <input
        id={id}
        type="number"
        min={0}
        step={step}
        value={value === 0 ? '' : value}
        onChange={(e) => {
          const v = parseFloat(e.target.value.replace(',', '.'));
          onChange(Number.isNaN(v) ? 0 : v);
        }}
        placeholder="0"
        className={`w-full bg-slate-950 border border-slate-700 text-white text-sm font-black rounded-xl py-3 focus:border-indigo-500 transition-colors text-right ${
          prefix ? 'pl-8 pr-4' : suffix ? 'pl-4 pr-8' : 'px-4'
        }`}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm select-none">
          {suffix}
        </span>
      )}
    </div>
  </div>
);

// ====================================================
// UI: SELECT
// ====================================================
export const FieldSelect = ({
  id,
  label,
  value,
  onChange,
  options,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
}) => (
  <div className="space-y-1">
    <label htmlFor={id} className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
      {label}
      {hint && <span className="normal-case ml-1 text-slate-600">({hint})</span>}
    </label>
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-slate-950 border border-slate-700 text-white text-sm font-black rounded-xl py-3 pl-4 pr-10 focus:border-indigo-500 transition-colors appearance-none cursor-pointer"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </div>
);

// ====================================================
// UI: CAMPO DE TIEMPO (HH:MM)
// ====================================================
export const TimeField = ({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: number; // horas decimales
  onChange: (v: number) => void;
  hint?: string;
}) => (
  <div className="space-y-1">
    <label htmlFor={id} className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
      {label}
      {hint && <span className="normal-case ml-1 text-slate-600">({hint})</span>}
    </label>
    <input
      id={id}
      type="text"
      inputMode="numeric"
      value={hoursToTime(value)}
      onChange={(e) => onChange(timeToHours(e.target.value))}
      placeholder="HH:MM"
      className="w-full bg-slate-950 border border-slate-700 text-white text-sm font-black rounded-xl py-3 px-4 focus:border-indigo-500 transition-colors"
    />
  </div>
);
