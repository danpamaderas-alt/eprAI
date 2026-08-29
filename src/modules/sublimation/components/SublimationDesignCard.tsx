import { memo } from 'react';
import {
  BadgeCheck,
  ExternalLink,
  FileType2,
  ImageIcon,
  Palette,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useImageSrc } from '../../../shared/hooks/useImageSrc';
import type { SublimationDesign } from '../types';
import { SublimationStatusBadge } from './SublimationStatusBadge';

interface SublimationDesignCardProps {
  design: SublimationDesign;
  onEdit: (design: SublimationDesign) => void;
  onDelete: (design: SublimationDesign) => void;
  onOpen: (design: SublimationDesign) => void;
}

export const SublimationDesignCard = memo(function SublimationDesignCard({
  design,
  onEdit,
  onDelete,
  onOpen,
}: SublimationDesignCardProps) {
  const isArchived = design.status === 'Archivado';
  const isPOD = design.pod_permitido === true;
  const imgSrc = useImageSrc(design.imagen);

  return (
    <article className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-fuchsia-500/10 hover:border-fuchsia-400/40 dark:hover:border-fuchsia-500/40 transition-colors duration-300 overflow-hidden flex flex-col">
      {/* Imagen / placeholder */}
      <button
        type="button"
        onClick={() => onOpen(design)}
        className={`relative w-full aspect-[4/3] overflow-hidden focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2 ${isArchived ? 'grayscale opacity-60' : ''}`}
        aria-label={`Ver detalle de ${design.name}`}
      >
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={design.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = 'none';
              target.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        {!imgSrc && (
          <div className="w-full h-full bg-gradient-to-br from-fuchsia-600/20 via-slate-800 to-slate-900 flex items-center justify-center">
            <Palette className="w-14 h-14 text-fuchsia-400/40" aria-hidden="true" />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <SublimationStatusBadge status={design.status} />
        </div>
        <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur text-white text-[9px] font-black uppercase tracking-widest">
          {design.category}
        </span>
        {isPOD && (
          <span className="absolute top-3 right-3 px-2 py-1 rounded-full bg-emerald-500/90 text-white text-[9px] font-black uppercase tracking-widest shadow">
            <BadgeCheck className="w-3 h-3 inline mr-1 -mt-0.5" aria-hidden="true" />
            POD
          </span>
        )}
      </button>

      {/* Cuerpo */}
      <div className="p-4 flex flex-col flex-1 gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight line-clamp-2">
            {design.name}
          </h3>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-1">
            {design.platform ?? 'Plataforma sin definir'}
          </p>
        </div>

        {/* Metadatos técnicos */}
        <div className="grid grid-cols-3 gap-2">
          <div className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center">
            <FileType2 className="w-3.5 h-3.5 mx-auto text-fuchsia-500 mb-1" aria-hidden="true" />
            <p className="text-[10px] font-black text-slate-700 dark:text-slate-200 truncate">
              {design.file_format ?? '—'}
            </p>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Formato</p>
          </div>
          <div className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center">
            <ImageIcon className="w-3.5 h-3.5 mx-auto text-amber-500 mb-1" aria-hidden="true" />
            <p className="text-[10px] font-black text-slate-700 dark:text-slate-200">
              {design.dpi != null ? `${design.dpi} DPI` : '—'}
            </p>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Resolución</p>
          </div>
          <div className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center">
            <BadgeCheck className="w-3.5 h-3.5 mx-auto text-emerald-500 mb-1" aria-hidden="true" />
            <p className="text-[10px] font-black text-slate-700 dark:text-slate-200 truncate">
              {design.license_type ?? '—'}
            </p>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Licencia</p>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 pt-1 mt-auto">
          <button
            type="button"
            onClick={() => onOpen(design)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-[10px] font-black uppercase tracking-widest transition-colors focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2"
          >
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
            Detalle
          </button>
          <button
            type="button"
            onClick={() => onEdit(design)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 transition-colors focus-visible:ring-2 focus-visible:ring-fuchsia-500"
            aria-label={`Editar ${design.name}`}
          >
            <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(design)}
            className="p-2 rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 transition-colors focus-visible:ring-2 focus-visible:ring-rose-500"
            aria-label={`Eliminar ${design.name}`}
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
});