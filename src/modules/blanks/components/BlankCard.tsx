import { memo } from 'react';
import { Minus, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import type { TextileBlank } from '../types';

interface BlankCardProps {
  blank: TextileBlank;
  onEdit: (blank: TextileBlank) => void;
  onDelete: (blank: TextileBlank) => void;
  onAdjust: (blank: TextileBlank, delta: number) => void;
}

export const BlankCard = memo(function BlankCard({
  blank,
  onEdit,
  onDelete,
  onAdjust,
}: BlankCardProps) {
  const isLow = blank.stock_qty <= (blank.min_stock ?? 0);
  const outOfStock = blank.stock_qty <= 0;

  return (
    <article className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-fuchsia-500/10 transition-colors duration-300 overflow-hidden flex flex-col">
      {/* Imagen / placeholder */}
      <div className="relative w-full aspect-[5/3] overflow-hidden bg-gradient-to-br from-fuchsia-600/15 via-slate-800 to-slate-900">
        {blank.imagen ? (
          <img
            src={blank.imagen}
            alt={blank.name}
            loading="lazy"
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${outOfStock ? 'grayscale opacity-60' : ''}`}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl font-black text-white/20 uppercase">{blank.type[0]}</span>
          </div>
        )}
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur text-white text-[9px] font-black uppercase tracking-widest">
          {blank.type}
        </span>
        {(isLow || outOfStock) && (
          <span
            className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
              outOfStock
                ? 'bg-rose-600 text-white'
                : 'bg-amber-500/90 text-slate-900'
            }`}
          >
            {outOfStock ? 'Sin stock' : 'Reponer'}
          </span>
        )}
      </div>

      {/* Cuerpo */}
      <div className="p-4 flex flex-col flex-1 gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight line-clamp-2">
            {blank.name}
          </h3>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-1 truncate">
            {[blank.size, blank.color].filter(Boolean).join(' · ') || 'Sin variante'}
          </p>
        </div>

        {/* Datos */}
        <div className="grid grid-cols-2 gap-2">
          <div className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center">
            <p className="text-xs font-black text-slate-700 dark:text-slate-200">
              ${blank.cost_price.toLocaleString('es-AR')}
            </p>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Costo c/u</p>
          </div>
          <div className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center">
            <p className={`text-xs font-black ${isLow ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {blank.stock_qty} u.
            </p>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Stock (mín {blank.min_stock})</p>
          </div>
        </div>

        {blank.provider && (
          <p className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">
            <Wallet className="w-3 h-3 shrink-0" aria-hidden="true" />
            {blank.provider}
          </p>
        )}

        {/* Acciones */}
        <div className="flex items-center gap-2 pt-1 mt-auto">
          <button
            type="button"
            onClick={() => onAdjust(blank, -1)}
            disabled={blank.stock_qty <= 0}
            aria-label={`Restar una unidad de ${blank.name}`}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Minus className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onAdjust(blank, 1)}
            aria-label={`Sumar una unidad de ${blank.name}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-[10px] font-black uppercase tracking-widest transition-colors focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2"
          >
            <Plus className="w-3 h-3" aria-hidden="true" />
            Sumar stock
          </button>
          <button
            type="button"
            onClick={() => onEdit(blank)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500"
            aria-label={`Editar ${blank.name}`}
          >
            <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(blank)}
            className="p-2 rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 transition-colors focus-visible:ring-2 focus-visible:ring-rose-500"
            aria-label={`Eliminar ${blank.name}`}
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
});
