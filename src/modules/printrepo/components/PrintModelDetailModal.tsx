import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Clock,
  ExternalLink,
  Factory,
  Layers,
  Link2,
  Pencil,
  Trash2,
  Weight,
  Calculator,
} from 'lucide-react';
import { Modal } from '../../../shared/components/ui/Modal';
import Swal from 'sweetalert2';
import { useToastStore } from '../../../store/useToastStore';
import { usePrintModelStore } from '../store/usePrintModelStore';
import { usePrintModelFileStore } from '../store/usePrintModelFileStore';
import { usePrintJobStore } from '../../printjobs/store/usePrintJobStore';
import { formatHoursHuman, hoursToTime } from '../../../shared/utils/format';
import { type PrintModel, type PrintStatus } from '../types';
import { PrintStatusBadge } from './PrintStatusBadge';
import { PrintModelFilesSection } from './PrintModelFilesSection';

interface PrintModelDetailModalProps {
  model: PrintModel | null;
  onClose: () => void;
  onEdit: (model: PrintModel) => void;
}

const formatDate = (d: string | null): string => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatHours = (hours: number | null): string =>
  hours == null ? '—' : formatHoursHuman(hours);

const formatGrams = (grams: number | null): string =>
  grams == null ? '—' : `${grams} g`;

const STATUS_ACTIONS: { status: PrintStatus; className: string }[] = [
  { status: 'En Cola', className: 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/30' },
  { status: 'Imprimiendo', className: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/30' },
  { status: 'Completado', className: 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/30' },
  { status: 'Descartado', className: 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border-rose-500/30' },
];

export const PrintModelDetailModal = memo(function PrintModelDetailModal({
  model,
  onClose,
  onEdit,
}: PrintModelDetailModalProps) {
  const setStatus = usePrintModelStore((s) => s.setStatus);
  const deleteModel = usePrintModelStore((s) => s.deleteModel);
  const removeAllForModel = usePrintModelFileStore((s) => s.removeAllForModel);
  const addJob = usePrintJobStore((s) => s.addJob);
  const toast = useToastStore((s) => s.toast);
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSendingToProduction, setIsSendingToProduction] = useState(false);

  if (!model) return null;

  const handleCalculateCost = () => {
    const params = new URLSearchParams();
    params.set('fromModel', model.id);
    params.set('name', model.name);
    if (model.estimated_grams != null) params.set('weight', String(model.estimated_grams));
    if (model.estimated_time_hours != null) {
      params.set('time', hoursToTime(model.estimated_time_hours));
    }
    onClose();
    void navigate(`/calculadora-3d?${params.toString()}`);
  };

  const handleSendToProduction = async () => {
    setIsSendingToProduction(true);
    try {
      await addJob({
        name: model.name,
        status: 'presupuestado',
        inputs: {
          source: 'repositorio-detalle',
          category: model.category,
          material_modelo: model.material,
          estimated_grams_modelo: model.estimated_grams,
          estimated_time_hours_modelo: model.estimated_time_hours,
        },
        quantity: 1,
        est_weight_g: model.estimated_grams ?? null,
        est_time_h: model.estimated_time_hours ?? null,
        model_id: model.id,
      });
      toast('Enviado a Producción 3D como presupuestado', { type: 'success' });
    } catch (err) {
      console.error(err);
      toast('No se pudo enviar a producción', { type: 'error' });
    } finally {
      setIsSendingToProduction(false);
    }
  };

  const handleStatusChange = async (status: PrintStatus) => {
    try {
      await setStatus(model.id, status);
      toast(`Estado actualizado a «${status}»`, { type: 'success' });
    } catch (err) {
      console.error(err);
      toast('No se pudo actualizar el estado', { type: 'error' });
    }
  };

  const handleDelete = () => {
    void Swal.fire({
      title: '¿Eliminar este modelo?',
      text: `«${model.name}» se eliminará junto con sus archivos adjuntos (originales y G-codes).`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e11d48',
    }).then(async (result) => {
      if (!result.isConfirmed) return;
      setIsDeleting(true);
      try {
        await removeAllForModel(model.id);
      } catch (err) {
        console.error('purga de archivos del modelo:', err);
      }
      try {
        await deleteModel(model.id);
        toast('Modelo eliminado del repositorio', { type: 'info' });
        onClose();
      } catch (err) {
        console.error(err);
        toast('No se pudo eliminar el modelo', { type: 'error' });
      } finally {
        setIsDeleting(false);
      }
    });
  };

  const specs: { label: string; value: string; icon: typeof Clock }[] = [
    { label: 'Altura de capa', value: model.layer_height != null ? `${model.layer_height} mm` : '—', icon: Layers },
    { label: 'Relleno (infill)', value: model.infill != null ? `${model.infill}%` : '—', icon: Layers },
    { label: 'Tiempo estimado', value: formatHours(model.estimated_time_hours), icon: Clock },
    { label: 'Gramos estimados', value: formatGrams(model.estimated_grams), icon: Weight },
  ];

  return (
    <Modal
      isOpen={!!model}
      onClose={onClose}
      title="Detalle del Modelo"
      showCancel={false}
      width="max-w-xl"
    >
      {/* Hero con imagen */}
      <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800">
        {model.imagen ? (
          <img
            src={model.imagen}
            alt={model.name}
            className="w-full aspect-[16/9] object-cover"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = 'none';
              target.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        {!model.imagen && (
          <div className="w-full aspect-[16/9] bg-gradient-to-br from-brand-600/20 via-slate-800 to-slate-900 flex items-center justify-center">
            <Box className="w-16 h-16 text-brand-400/40" aria-hidden="true" />
          </div>
        )}
        <div className="hidden" aria-hidden="true" />
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <PrintStatusBadge status={model.status} />
            <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest">
              {model.category}
            </span>
          </div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
            {model.name}
          </h2>
          {model.material && (
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              {model.material}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleCalculateCost}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest transition-colors"
          >
            <Calculator className="w-3.5 h-3.5" aria-hidden="true" />
            Calcular costo
          </button>
          <button
            type="button"
            onClick={() => void handleSendToProduction()}
            disabled={isSendingToProduction}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-50"
          >
            <Factory className="w-3.5 h-3.5" aria-hidden="true" />
            {isSendingToProduction ? 'Enviando…' : 'A Producción'}
          </button>
        </div>
        <button
          type="button"
          onClick={() => onEdit(model)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
          Editar
        </button>
      </div>

      {/* Parámetros técnicos */}
      <div className="grid grid-cols-2 gap-3">
        {specs.map((spec) => (
          <div
            key={spec.label}
            className="px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-3"
          >
            <spec.icon className="w-4 h-4 text-brand-500 shrink-0" aria-hidden="true" />
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

      {/* Link de descarga */}
      {model.link_descarga ? (
        <a
          href={model.link_descarga}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-brand-600/10 hover:bg-brand-600/20 border border-brand-500/30 transition-colors group"
        >
          <span className="flex items-center gap-2 text-xs font-black text-brand-600 dark:text-brand-400">
            <Link2 className="w-4 h-4" aria-hidden="true" />
            Ver archivo / página de descarga
          </span>
          <ExternalLink className="w-4 h-4 text-brand-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" aria-hidden="true" />
        </a>
      ) : (
        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider px-1">
          Sin link de descarga cargado
        </p>
      )}

      {/* Archivos STL / G-code */}
      <PrintModelFilesSection modelId={model.id} />

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
              disabled={model.status === action.status}
              className={`px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-colors ${
                model.status === action.status
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
          Creado: {formatDate(model.created_at)} · Actualizado: {formatDate(model.updated_at)}
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