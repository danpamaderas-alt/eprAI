import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Box,
  Plus,
  Search,
  Filter,
  LayoutGrid,
  Clock,
  Printer,
  CheckCircle2,
  PackageX,
  Lightbulb,
  FileDown,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { usePrintModelStore, PRINT_STATUSES } from '../store/usePrintModelStore';
import { PrintModelCard } from '../components/PrintModelCard';
import { PrintModelFormModal } from '../components/PrintModelFormModal';
import { PrintModelDetailModal } from '../components/PrintModelDetailModal';
import { exportModelsCSV, exportModelsPDF } from '../utils/export';
import type { PrintModel } from '../types';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { Spinner } from '../../../shared/components/ui/Spinner';
import { useToastStore } from '../../../store/useToastStore';

const STATUS_FILTERS = ['Todos', ...PRINT_STATUSES] as const;

const STATUS_KPI: { key: string; label: string; icon: typeof Clock; className: string }[] = [
  { key: 'Idea', label: 'Ideas', icon: Lightbulb, className: 'bg-slate-500/10 text-slate-400' },
  { key: 'En Cola', label: 'En Cola', icon: Clock, className: 'bg-amber-500/10 text-amber-500' },
  { key: 'Imprimiendo', label: 'Imprimiendo', icon: Printer, className: 'bg-blue-500/10 text-blue-500' },
  { key: 'Completado', label: 'Completados', icon: CheckCircle2, className: 'bg-emerald-500/10 text-emerald-500' },
  { key: 'Descartado', label: 'Descartados', icon: PackageX, className: 'bg-rose-500/10 text-rose-500' },
];

export const PrintRepository = () => {
  const { models, isLoading, error, fetchModels, deleteModel } = usePrintModelStore();
  const toast = useToastStore((s) => s.toast);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [categoryFilter, setCategoryFilter] = useState<string>('Todas');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<PrintModel | null>(null);
  const [detailModel, setDetailModel] = useState<PrintModel | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const categories = useMemo(() => {
    const set = new Set(models.map((m) => m.category).filter(Boolean));
    return ['Todas', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [models]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return models.filter((m) => {
      if (statusFilter !== 'Todos' && m.status !== statusFilter) return false;
      if (categoryFilter !== 'Todas' && m.category !== categoryFilter) return false;
      if (!term) return true;
      return (
        m.name.toLowerCase().includes(term) ||
        (m.material?.toLowerCase().includes(term) ?? false) ||
        (m.category?.toLowerCase().includes(term) ?? false)
      );
    });
  }, [models, searchTerm, statusFilter, categoryFilter]);

  const kpiCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of PRINT_STATUSES) counts[s] = 0;
    for (const m of models) counts[m.status] = (counts[m.status] ?? 0) + 1;
    return counts;
  }, [models]);

  const totalPrintingHours = useMemo(
    () =>
      filtered
        .filter((m) => m.status === 'Imprimiendo' || m.status === 'En Cola')
        .reduce((acc, m) => acc + (m.estimated_time_hours ?? 0), 0),
    [filtered],
  );

  const handleOpenForm = useCallback(() => {
    setEditingModel(null);
    setIsFormOpen(true);
  }, []);

  const handleEdit = useCallback((model: PrintModel) => {
    setDetailModel(null);
    setEditingModel(model);
    setIsFormOpen(true);
  }, []);

  const handleDelete = useCallback(
    (model: PrintModel) => {
      Swal.fire({
        title: '¿Eliminar este modelo?',
        text: `«${model.name}» se eliminará del repositorio.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#e11d48',
      }).then(async (result) => {
        if (!result.isConfirmed) return;
        try {
          await deleteModel(model.id);
          if (detailModel?.id === model.id) setDetailModel(null);
          toast('Modelo eliminado del repositorio', { type: 'info' });
        } catch (err) {
          console.error(err);
          toast('No se pudo eliminar el modelo', { type: 'error' });
        }
      });
    },
    [deleteModel, detailModel, toast],
  );

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/30 shrink-0">
            <Box size={28} className="text-white" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">
              Repositorio Impresión 3D
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Catálogo de modelos: descargas, parámetros técnicos y pipeline de impresión.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              if (filtered.length === 0) return;
              exportModelsCSV(filtered);
              toast('CSV generado', { type: 'success' });
            }}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileDown className="w-3.5 h-3.5" aria-hidden="true" />
            CSV
          </button>
          <button
            type="button"
            onClick={async () => {
              if (filtered.length === 0) return;
              setIsExportingPDF(true);
              try {
                await exportModelsPDF(filtered);
                toast('PDF generado', { type: 'success' });
              } catch (err) {
                console.error(err);
                toast('No se pudo generar el PDF', { type: 'error' });
              } finally {
                setIsExportingPDF(false);
              }
            }}
            disabled={filtered.length === 0 || isExportingPDF}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isExportingPDF ? (
              <Spinner className="w-3.5 h-3.5 text-violet-500" />
            ) : (
              <FileDown className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            {isExportingPDF ? 'Generando...' : 'PDF'}
          </button>
          <button
            type="button"
            onClick={handleOpenForm}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-violet-600/30 transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Nuevo Modelo
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {STATUS_KPI.map((kpi) => (
          <div
            key={kpi.key}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3"
          >
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${kpi.className}`}>
              <kpi.icon className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                {kpiCounts[kpi.key] ?? 0}
              </p>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 truncate">
                {kpi.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* FILTROS */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, material o categoría..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <Filter className="w-3.5 h-3.5" aria-hidden="true" />
            Estado
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 cursor-pointer"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 cursor-pointer"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Estado del filtro */}
      {filtered.length > 0 && (
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
          <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
          {filtered.length} modelo{filtered.length !== 1 ? 's' : ''} · ~{totalPrintingHours.toFixed(1)}h de impresión pendiente
        </p>
      )}

      {/* CONTENIDO */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" className="text-violet-500" />
        </div>
      ) : error ? (
        <div className="py-16 text-center">
          <p className="text-sm font-bold text-rose-500">{error}</p>
          <p className="text-xs text-slate-400 mt-1">
            Verificá que la tabla «print_models» exista en Supabase (migración sql/009_print_models.sql).
          </p>
        </div>
      ) : models.length === 0 ? (
        <EmptyState
          icon={<Box className="w-8 h-8" />}
          title="Repositorio vacío"
          description="Cargá tu primer modelo 3D con su link de descarga, imagen y parámetros técnicos para empezar a armar el pipeline de impresión."
          action={
            <button
              type="button"
              onClick={handleOpenForm}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-black text-xs uppercase tracking-widest transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Agregar Modelo
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="w-8 h-8" />}
          title="Sin resultados"
          description="Ningún modelo coincide con los filtros actuales. Ajustá la búsqueda o el filtro de estado."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((model) => (
            <PrintModelCard
              key={model.id}
              model={model}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onOpen={setDetailModel}
            />
          ))}
        </div>
      )}

      {/* MODALES */}
      <PrintModelFormModal
        key={isFormOpen ? `form-${editingModel?.id ?? 'new'}` : 'form-closed'}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingModel(null);
        }}
        editingModel={editingModel}
      />
      <PrintModelDetailModal
        model={detailModel}
        onClose={() => setDetailModel(null)}
        onEdit={handleEdit}
      />
    </div>
  );
};