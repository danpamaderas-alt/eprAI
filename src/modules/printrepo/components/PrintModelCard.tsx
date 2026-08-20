import { memo } from 'react';
import {
  Box,
  Clock,
  ExternalLink,
  Layers,
  Pencil,
  Trash2,
  Weight,
} from 'lucide-react';
import type { PrintModel } from '../types';
import { PrintStatusBadge } from './PrintStatusBadge';

interface PrintModelCardProps {
  model: PrintModel;
  onEdit: (model: PrintModel) => void;
  onDelete: (model: PrintModel) => void;
  onOpen: (model: PrintModel) => void;
}

const formatHours = (hours: number | null): string => {
  if (hours == null) return '—';
  return `${hours}h`;
};

const formatGrams = (grams: number | null): string => {
  if (grams == null) return '—';
  return `${grams}g`;
};

export const PrintModelCard = memo(function PrintModelCard({
  model,
  onEdit,
  onDelete,
  onOpen,
}: PrintModelCardProps) {
  const isDiscarded = model.status === 'Descartado';

  return (
    <article
      className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-brand-500/10 hover:border-brand-400/40 dark:hover:border-brand-500/40 transition-all duration-300 overflow-hidden flex flex-col"
    >
      {/* Imagen / placeholder */}
      <button
        type="button"
        onClick={() => onOpen(model)}
        className={`relative w-full aspect-[4/3] overflow-hidden focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${isDiscarded ? 'grayscale opacity-60' : ''}`}
        aria-label={`Ver detalle de ${model.name}`}
      >
        {model.imagen ? (
          <img
            src={model.imagen}
            alt={model.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = 'none';
              target.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        {!model.imagen && (
          <div className="w-full h-full bg-gradient-to-br from-brand-600/20 via-slate-800 to-slate-900 flex items-center justify-center">
            <Box className="w-14 h-14 text-brand-400/40" aria-hidden="true" />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <PrintStatusBadge status={model.status} />
        </div>
        <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur text-white text-[9px] font-black uppercase tracking-widest">
          {model.category}
        </span>
      </button>

      {/* Cuerpo */}
      <div className="p-4 flex flex-col flex-1 gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight line-clamp-2">
            {model.name}
          </h3>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-1">
            {model.material ?? 'Filamento sin definir'}
          </p>
        </div>

        {/* Parámetros técnicos */}
        <div className="grid grid-cols-3 gap-2">
          <div className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center">
            <Layers className="w-3.5 h-3.5 mx-auto text-brand-500 mb-1" aria-hidden="true" />
            <p className="text-[10px] font-black text-slate-700 dark:text-slate-200">
              {model.layer_height != null ? `${model.layer_height}mm` : '—'}
            </p>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Capa</p>
          </div>
          <div className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center">
            <Clock className="w-3.5 h-3.5 mx-auto text-amber-500 mb-1" aria-hidden="true" />
            <p className="text-[10px] font-black text-slate-700 dark:text-slate-200">
              {formatHours(model.estimated_time_hours)}
            </p>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Tiempo</p>
          </div>
          <div className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center">
            <Weight className="w-3.5 h-3.5 mx-auto text-emerald-500 mb-1" aria-hidden="true" />
            <p className="text-[10px] font-black text-slate-700 dark:text-slate-200">
              {formatGrams(model.estimated_grams)}
            </p>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Peso</p>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 pt-1 mt-auto">
          <button
            type="button"
            onClick={() => onOpen(model)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-[10px] font-black uppercase tracking-widest transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
            Detalle
          </button>
          <button
            type="button"
            onClick={() => onEdit(model)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500"
            aria-label={`Editar ${model.name}`}
          >
            <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(model)}
            className="p-2 rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 transition-colors focus-visible:ring-2 focus-visible:ring-rose-500"
            aria-label={`Eliminar ${model.name}`}
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
});