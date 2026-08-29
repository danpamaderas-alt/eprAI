import { memo } from 'react';
import { Pencil, Ruler, Trash2 } from 'lucide-react';
import type { MockupTemplate } from '../types';

interface MockupTemplateCardProps {
  template: MockupTemplate;
  onEdit: (template: MockupTemplate) => void;
  onDelete: (template: MockupTemplate) => void;
}

export const MockupTemplateCard = memo(function MockupTemplateCard({
  template,
  onEdit,
  onDelete,
}: MockupTemplateCardProps) {
  const hasArea =
    template.print_area_width_mm != null && template.print_area_height_mm != null;

  return (
    <article className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-sky-500/10 transition-colors duration-300 overflow-hidden flex flex-col">
      {/* Imagen base / placeholder */}
      <div className="relative w-full aspect-[5/3] overflow-hidden bg-gradient-to-br from-sky-600/15 via-slate-800 to-slate-900">
        {template.template_image ? (
          <img
            src={template.template_image}
            alt={template.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center relative">
            {hasArea && (
              <div
                className="absolute border-2 border-dashed border-sky-400/50 rounded-lg"
                style={{
                  width: `${Math.min(80, (template.print_area_width_mm ?? 100) / 3)}%`,
                  height: `${Math.min(80, (template.print_area_height_mm ?? 100) / 3)}%`,
                }}
                aria-hidden="true"
              />
            )}
            <span className="text-4xl font-black text-white/20 uppercase">{template.product_type[0]}</span>
          </div>
        )}
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur text-white text-[9px] font-black uppercase tracking-widest">
          {template.product_type}
        </span>
      </div>

      {/* Cuerpo */}
      <div className="p-4 flex flex-col flex-1 gap-3">
        <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight line-clamp-2">
          {template.name}
        </h3>

        <div
          className={`px-2.5 py-2 rounded-xl border text-center ${
            hasArea
              ? 'bg-sky-500/10 border-sky-500/20'
              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-100 dark:border-slate-800'
          }`}
        >
          <p className={`text-xs font-black ${hasArea ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'}`}>
            {hasArea
              ? `${template.print_area_width_mm} × ${template.print_area_height_mm} mm`
              : 'Área sin definir'}
          </p>
          <p className="flex items-center justify-center gap-1 text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
            <Ruler className="w-2.5 h-2.5" aria-hidden="true" />
            Área de impresión
          </p>
        </div>

        {template.notes && (
          <p className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-2">{template.notes}</p>
        )}

        {/* Acciones */}
        <div className="flex items-center gap-2 pt-1 mt-auto">
          <button
            type="button"
            onClick={() => onEdit(template)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-black uppercase tracking-widest transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
          >
            <Pencil className="w-3 h-3" aria-hidden="true" />
            Editar
          </button>
          <button
            type="button"
            onClick={() => onDelete(template)}
            className="p-2 rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 transition-colors focus-visible:ring-2 focus-visible:ring-rose-500"
            aria-label={`Eliminar ${template.name}`}
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
});
