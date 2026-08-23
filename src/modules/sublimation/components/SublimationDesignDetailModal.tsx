import { memo, useState } from 'react';
import {
  BadgeCheck,
  Coins,
  ExternalLink,
  FileType2,
  ImageIcon,
  Link2,
  Palette,
  Pencil,
  Share2,
  StickyNote,
  Tag,
  Trash2,
  User,
  Wand2,
} from 'lucide-react';
import { Modal } from '../../../shared/components/ui/Modal';
import { useToastStore } from '../../../store/useToastStore';
import { useSublimationStore } from '../store/useSublimationStore';
import {
  type SublimationDesign,
  type SublimationStatus,
} from '../types';
import { SublimationStatusBadge } from './SublimationStatusBadge';

interface SublimationDesignDetailModalProps {
  design: SublimationDesign | null;
  onClose: () => void;
  onEdit: (design: SublimationDesign) => void;
  onOpenStudio?: (design: SublimationDesign) => void;
  onOpenMockup?: (design: SublimationDesign) => void;
}

const formatDate = (d: string | null): string => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatPrice = (design: SublimationDesign): string => {
  if (design.price == null) return '—';
  const currency = design.currency || 'USD';
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(design.price);
  } catch {
    return `${design.price} ${currency}`;
  }
};

const STATUS_ACTIONS: { status: SublimationStatus; className: string }[] = [
  { status: 'Descargado', className: 'bg-sky-500/10 text-sky-500 hover:bg-sky-500/20 border-sky-500/30' },
  { status: 'En Preparación', className: 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/30' },
  { status: 'Listo para Imprimir', className: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/30' },
  { status: 'Usado', className: 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/30' },
  { status: 'Archivado', className: 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border-rose-500/30' },
];

export const SublimationDesignDetailModal = memo(function SublimationDesignDetailModal({
  design,
  onClose,
  onEdit,
  onOpenStudio,
  onOpenMockup,
}: SublimationDesignDetailModalProps) {
  const setStatus = useSublimationStore((s) => s.setStatus);
  const deleteDesign = useSublimationStore((s) => s.deleteDesign);
  const toast = useToastStore((s) => s.toast);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!design) return null;

  const handleStatusChange = async (status: SublimationStatus) => {
    try {
      await setStatus(design.id, status);
      toast(`Estado actualizado a «${status}»`, { type: 'success' });
    } catch (err) {
      console.error(err);
      toast('No se pudo actualizar el estado', { type: 'error' });
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteDesign(design.id);
      toast('Diseño eliminado del repositorio', { type: 'info' });
      onClose();
    } catch (err) {
      console.error(err);
      toast('No se pudo eliminar el diseño', { type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const specs: { label: string; value: string; icon: typeof FileType2 }[] = [
    { label: 'Formato', value: design.file_format ?? '—', icon: FileType2 },
    { label: 'Resolución', value: design.dpi != null ? `${design.dpi} DPI` : '—', icon: ImageIcon },
    {
      label: 'Fondo',
      value: design.background ?? '—',
      icon: Palette,
    },
    { label: 'Licencia', value: design.license_type ?? '—', icon: BadgeCheck },
  ];

  const price = formatPrice(design);

  return (
    <Modal
      isOpen={!!design}
      onClose={onClose}
      title="Detalle del Diseño"
      showCancel={false}
      width="max-w-2xl"
    >
      {/* Hero con imagen */}
      <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800">
        {design.imagen ? (
          <img
            src={design.imagen}
            alt={design.name}
            className="w-full aspect-[16/9] object-cover"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = 'none';
              target.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        {!design.imagen && (
          <div className="w-full aspect-[16/9] bg-gradient-to-br from-fuchsia-600/20 via-slate-800 to-slate-900 flex items-center justify-center">
            <Palette className="w-16 h-16 text-fuchsia-400/40" aria-hidden="true" />
          </div>
        )}
        <div className="hidden" aria-hidden="true" />
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <SublimationStatusBadge status={design.status} />
            <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest">
              {design.category}
            </span>
            {design.platform && (
              <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest">
                {design.platform}
              </span>
            )}
          </div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
            {design.name}
          </h2>
          {design.designer && (
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              <User className="w-3 h-3 inline mr-1 -mt-0.5" aria-hidden="true" />
              {design.designer}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onOpenMockup && design.imagen && (
            <button
              type="button"
              onClick={() => onOpenMockup(design)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
              Mockup
            </button>
          )}
          {onOpenStudio && (
            <button
              type="button"
              onClick={() => onOpenStudio(design)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-fuchsia-600/10 hover:bg-fuchsia-600/20 border border-fuchsia-500/30 text-fuchsia-600 dark:text-fuchsia-400 text-[10px] font-black uppercase tracking-widest transition-colors"
            >
              <Wand2 className="w-3.5 h-3.5" aria-hidden="true" />
              Estudio
            </button>
          )}
          <button
            type="button"
            onClick={() => onEdit(design)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
            Editar
          </button>
        </div>
      </div>

      {/* Especificaciones técnicas */}
      <div className="grid grid-cols-2 gap-3">
        {specs.map((spec) => (
          <div
            key={spec.label}
            className="px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-3"
          >
            <spec.icon className="w-4 h-4 text-fuchsia-500 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                {spec.label}
              </p>
              <p className="text-sm font-black text-slate-800 dark:text-slate-100 truncate">
                {spec.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Licencia y POD */}
      <div className="grid grid-cols-2 gap-3">
        <div className="px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <BadgeCheck className="w-4 h-4 text-emerald-500 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">POD</p>
            <p className="text-sm font-black text-slate-800 dark:text-slate-100 truncate">
              {design.pod_permitido === true
                ? `Permitido · ${design.pod_nivel ?? 'Básico'}`
                : 'No permitido'}
            </p>
          </div>
        </div>
        <div className="px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <Coins className="w-4 h-4 text-amber-500 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Costo</p>
            <p className="text-sm font-black text-slate-800 dark:text-slate-100 truncate">{price}</p>
          </div>
        </div>
      </div>

      {/* Descripción / etiquetas */}
      {(design.description || design.tags) && (
        <div className="space-y-3">
          {design.description && (
            <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
              <StickyNote className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
              <p>{design.description}</p>
            </div>
          )}
          {design.tags && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Tag className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              {design.tags.split(',').map((tag) => (
                <span
                  key={tag.trim()}
                  className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 text-[9px] font-black uppercase tracking-wider"
                >
                  {tag.trim()}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Enlaces */}
      {design.link_descarga || design.url_original ? (
        <div className="space-y-2">
          {design.link_descarga && (
            <a
              href={design.link_descarga}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-fuchsia-600/10 hover:bg-fuchsia-600/20 border border-fuchsia-500/30 transition-colors group"
            >
              <span className="flex items-center gap-2 text-xs font-black text-fuchsia-600 dark:text-fuchsia-400">
                <Link2 className="w-4 h-4" aria-hidden="true" />
                Descargar archivo
              </span>
              <ExternalLink
                className="w-4 h-4 text-fuchsia-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                aria-hidden="true"
              />
            </a>
          )}
          {design.url_original && (
            <a
              href={design.url_original}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors group"
            >
              <span className="flex items-center gap-2 text-xs font-black text-slate-600 dark:text-slate-300">
                <ExternalLink className="w-4 h-4" aria-hidden="true" />
                Ver página original
              </span>
              <ExternalLink
                className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                aria-hidden="true"
              />
            </a>
          )}
        </div>
      ) : (
        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider px-1">
          Sin enlaces cargados
        </p>
      )}

      {/* Cambiar estado */}
      <div>
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">
          Cambiar estado
        </p>
        <div className="flex flex-wrap gap-2">
          {STATUS_ACTIONS.map((action) => (
            <button
              key={action.status}
              type="button"
              onClick={() => handleStatusChange(action.status)}
              disabled={design.status === action.status}
              className={`px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-colors ${
                design.status === action.status
                  ? 'opacity-40 cursor-not-allowed'
                  : action.className
              }`}
            >
              {action.status}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
          Creado: {formatDate(design.created_at)} · Actualizado: {formatDate(design.updated_at)}
        </p>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-3 h-3" aria-hidden="true" />
          {isDeleting ? 'Eliminando...' : 'Eliminar'}
        </button>
      </div>
    </Modal>
  );
});