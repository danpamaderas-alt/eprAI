import { memo } from 'react';
import { AlertTriangle, Pencil, Scale, Trash2 } from 'lucide-react';
import type { PrintFilament } from '../types';

interface FilamentCardProps {
  filament: PrintFilament;
  onEdit: (filament: PrintFilament) => void;
  onDelete: (filament: PrintFilament) => void;
  onConsume: (filament: PrintFilament) => void;
}

export const FilamentCard = memo(function FilamentCard({
  filament,
  onEdit,
  onDelete,
  onConsume,
}: FilamentCardProps) {
  const spool = filament.spool_weight_g || 1000;
  const remaining = Math.max(0, filament.remaining_g);
  const pct = Math.min(100, Math.round((remaining / spool) * 100));
  const isLow = remaining <= (filament.min_stock_g ?? 0);
  const barColor =
    pct > 50 ? 'bg-emerald-500' : pct > 20 ? 'bg-amber-500' : 'bg-rose-500';
  const costPerGram =
    filament.cost_per_kg != null && filament.cost_per_kg > 0
      ? filament.cost_per_kg / 1000
      : null;

  return (
    <article className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-brand-500/10 transition-all duration-300 overflow-hidden flex flex-col">
      {/* Cabecera con color */}
      <div className="flex items-center gap-3 p-4 pb-3">
        <div
          className="w-12 h-12 rounded-2xl border-2 border-white dark:border-slate-700 shadow-inner shrink-0"
          style={{ backgroundColor: filament.color_hex || '#64748b' }}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight truncate">
            {filament.brand}
          </h3>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
            {filament.material}
            {filament.color_name ? ` · ${filament.color_name}` : ''}
          </p>
        </div>
        {isLow && (
          <span
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[9px] font-black uppercase tracking-widest shrink-0"
            title={`Stock bajo el mínimo (${filament.min_stock_g}g)`}
          >
            <AlertTriangle className="w-3 h-3" aria-hidden="true" />
            Repone
          </span>
        )}
      </div>

      {/* Barra de stock */}
      <div className="px-4 pb-2">
        <div className="flex justify-between items-baseline mb-1.5">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
            Stock restante
          </span>
          <span className="text-xs font-black text-slate-700 dark:text-slate-200">
            {Math.round(remaining)}g / {spool}g
          </span>
        </div>
        <div
          className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Stock restante de ${filament.brand} ${filament.color_name ?? ''}`}
        >
          <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Datos */}
      <div className="grid grid-cols-2 gap-2 px-4 pb-3">
        <div className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center">
          <p className="text-xs font-black text-slate-700 dark:text-slate-200">
            {filament.cost_per_kg != null ? `$${filament.cost_per_kg.toLocaleString('es-AR')}/kg` : '—'}
          </p>
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Costo kg</p>
        </div>
        <div className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center">
          <p className="text-xs font-black text-slate-700 dark:text-slate-200">
            {costPerGram != null ? `$${costPerGram.toFixed(3)}/g` : '—'}
          </p>
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Costo gramo</p>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-2 p-4 pt-1 mt-auto">
        <button
          type="button"
          onClick={() => onConsume(filament)}
          disabled={remaining <= 0}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-[10px] font-black uppercase tracking-widest transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Scale className="w-3 h-3" aria-hidden="true" />
          Descontar
        </button>
        <button
          type="button"
          onClick={() => onEdit(filament)}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500"
          aria-label={`Editar ${filament.brand} ${filament.color_name ?? ''}`}
        >
          <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(filament)}
          className="p-2 rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 transition-colors focus-visible:ring-2 focus-visible:ring-rose-500"
          aria-label={`Eliminar ${filament.brand} ${filament.color_name ?? ''}`}
        >
          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
});
