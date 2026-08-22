import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Palette,
  Plus,
  Search,
  Filter,
  LayoutGrid,
  CloudDownload,
  Hammer,
  CheckCircle2,
  Archive,
  FileDown,
  BadgeCheck,
  Sparkles,
  Wand2,
} from 'lucide-react';
import Swal from 'sweetalert2';
import {
  useSublimationStore,
  SUBLIMATION_STATUSES,
} from '../store/useSublimationStore';
import { SublimationDesignCard } from '../components/SublimationDesignCard';
import { SublimationDesignFormModal } from '../components/SublimationDesignFormModal';
import { SublimationDesignDetailModal } from '../components/SublimationDesignDetailModal';
import { DesignStudioModal } from '../components/DesignStudioModal';
import { exportDesignsCSV, exportDesignsPDF } from '../utils/export';
import type { SublimationDesign } from '../types';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { Spinner } from '../../../shared/components/ui/Spinner';
import { useToastStore } from '../../../store/useToastStore';

const STATUS_FILTERS = ['Todos', ...SUBLIMATION_STATUSES] as const;

const STATUS_KPI: { key: string; label: string; icon: typeof Palette; className: string }[] = [
  { key: 'Nuevo', label: 'Nuevos', icon: Sparkles, className: 'bg-violet-500/10 text-violet-500' },
  { key: 'Descargado', label: 'Descargados', icon: CloudDownload, className: 'bg-sky-500/10 text-sky-500' },
  { key: 'En Preparación', label: 'Preparando', icon: Hammer, className: 'bg-amber-500/10 text-amber-500' },
  { key: 'Listo para Imprimir', label: 'Listos', icon: CheckCircle2, className: 'bg-blue-500/10 text-blue-500' },
  { key: 'Usado', label: 'Usados', icon: BadgeCheck, className: 'bg-emerald-500/10 text-emerald-500' },
  { key: 'Archivado', label: 'Archivados', icon: Archive, className: 'bg-rose-500/10 text-rose-500' },
];

export const SublimationRepository = () => {
  const { designs, isLoading, error, fetchDesigns, deleteDesign } = useSublimationStore();
  const toast = useToastStore((s) => s.toast);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [categoryFilter, setCategoryFilter] = useState<string>('Todas');
  const [platformFilter, setPlatformFilter] = useState<string>('Todas');
  const [podFilter, setPodFilter] = useState<string>('Todos');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDesign, setEditingDesign] = useState<SublimationDesign | null>(null);
  const [detailDesign, setDetailDesign] = useState<SublimationDesign | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [studioDesign, setStudioDesign] = useState<SublimationDesign | null>(null);

  useEffect(() => {
    fetchDesigns();
  }, [fetchDesigns]);

  const categories = useMemo(() => {
    const set = new Set(designs.map((d) => d.category).filter(Boolean));
    return ['Todas', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [designs]);

  const platforms = useMemo(() => {
    const set = new Set(designs.map((d) => d.platform).filter(Boolean));
    return ['Todas', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [designs]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return designs.filter((d) => {
      if (statusFilter !== 'Todos' && d.status !== statusFilter) return false;
      if (categoryFilter !== 'Todas' && d.category !== categoryFilter) return false;
      if (platformFilter !== 'Todas' && d.platform !== platformFilter) return false;
      if (podFilter === 'POD' && d.pod_permitido !== true) return false;
      if (podFilter === 'No POD' && d.pod_permitido === true) return false;
      if (!term) return true;
      return (
        d.name.toLowerCase().includes(term) ||
        (d.platform?.toLowerCase().includes(term) ?? false) ||
        (d.category?.toLowerCase().includes(term) ?? false) ||
        (d.tags?.toLowerCase().includes(term) ?? false) ||
        (d.designer?.toLowerCase().includes(term) ?? false)
      );
    });
  }, [designs, searchTerm, statusFilter, categoryFilter, platformFilter, podFilter]);

  const kpiCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of SUBLIMATION_STATUSES) counts[s] = 0;
    for (const d of designs) counts[d.status] = (counts[d.status] ?? 0) + 1;
    return counts;
  }, [designs]);

  const podCount = useMemo(() => designs.filter((d) => d.pod_permitido === true).length, [designs]);

  const handleOpenForm = useCallback(() => {
    setEditingDesign(null);
    setIsFormOpen(true);
  }, []);

  const handleEdit = useCallback((design: SublimationDesign) => {
    setDetailDesign(null);
    setEditingDesign(design);
    setIsFormOpen(true);
  }, []);

  const handleDelete = useCallback(
    (design: SublimationDesign) => {
      Swal.fire({
        title: '¿Eliminar este diseño?',
        text: `«${design.name}» se eliminará del repositorio.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#e11d48',
      }).then(async (result) => {
        if (!result.isConfirmed) return;
        try {
          await deleteDesign(design.id);
          if (detailDesign?.id === design.id) setDetailDesign(null);
          toast('Diseño eliminado del repositorio', { type: 'info' });
        } catch (err) {
          console.error(err);
          toast('No se pudo eliminar el diseño', { type: 'error' });
        }
      });
    },
    [deleteDesign, detailDesign, toast],
  );

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-fuchsia-600 flex items-center justify-center shadow-lg shadow-fuchsia-600/30 shrink-0">
            <Palette size={28} className="text-white" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">
              Repositorio Sublimación
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Diseños para sublimar: descargas, formato técnico, licencia y pipeline de producción.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              if (filtered.length === 0) return;
              exportDesignsCSV(filtered);
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
                await exportDesignsPDF(filtered);
                toast('PDF generado', { type: 'success' });
              } catch (err) {
                console.error(err);
                toast('No se pudo generar el PDF', { type: 'error' });
              } finally {
                setIsExportingPDF(false);
              }
            }}
            disabled={filtered.length === 0 || isExportingPDF}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-300 hover:text-fuchsia-600 dark:hover:text-fuchsia-400 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isExportingPDF ? (
              <Spinner className="w-3.5 h-3.5 text-fuchsia-500" />
            ) : (
              <FileDown className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            {isExportingPDF ? 'Generando...' : 'PDF'}
          </button>
          <button
            type="button"
            onClick={() => {
              setStudioDesign(null);
              setIsStudioOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-700 dark:bg-fuchsia-600 dark:hover:bg-fuchsia-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-slate-900/20 dark:shadow-fuchsia-600/30 transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-fuchsia-500"
          >
            <Wand2 className="w-4 h-4" aria-hidden="true" />
            Estudio IA
          </button>
          <button
            type="button"
            onClick={handleOpenForm}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-fuchsia-600/30 transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Nuevo Diseño
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
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
            placeholder="Buscar por nombre, plataforma, etiqueta o diseñador..."
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

          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="px-3 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 cursor-pointer"
          >
            {platforms.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            value={podFilter}
            onChange={(e) => setPodFilter(e.target.value)}
            className="px-3 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 cursor-pointer"
          >
            <option value="Todos">Todos</option>
            <option value="POD">POD permitido</option>
            <option value="No POD">Sin POD</option>
          </select>
        </div>
      </div>

      {/* Estado del filtro */}
      {filtered.length > 0 && (
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
          <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
          {filtered.length} diseño{filtered.length !== 1 ? 's' : ''} · {podCount} con licencia POD
        </p>
      )}

      {/* CONTENIDO */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" className="text-fuchsia-500" />
        </div>
      ) : error ? (
        <div className="py-16 text-center">
          <p className="text-sm font-bold text-rose-500">{error}</p>
          <p className="text-xs text-slate-400 mt-1">
            Verificá que la tabla «sublimation_designs» exista en Supabase (migración sql/010_sublimation_designs.sql).
          </p>
        </div>
      ) : designs.length === 0 ? (
        <EmptyState
          icon={<Palette className="w-8 h-8" />}
          title="Repositorio vacío"
          description="Cargá tu primer diseño de sublimación con su link, imagen, formato técnico y licencia para armar la biblioteca de sublimación."
          action={
            <button
              type="button"
              onClick={handleOpenForm}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black text-xs uppercase tracking-widest transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Agregar Diseño
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="w-8 h-8" />}
          title="Sin resultados"
          description="Ningún diseño coincide con los filtros actuales. Ajustá la búsqueda o los filtros."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((design) => (
            <SublimationDesignCard
              key={design.id}
              design={design}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onOpen={setDetailDesign}
            />
          ))}
        </div>
      )}

      {/* MODALES */}
      <SublimationDesignFormModal
        key={isFormOpen ? `form-${editingDesign?.id ?? 'new'}` : 'form-closed'}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingDesign(null);
        }}
        editingDesign={editingDesign}
      />
      <SublimationDesignDetailModal
        design={detailDesign}
        onClose={() => setDetailDesign(null)}
        onEdit={handleEdit}
        onOpenStudio={(d) => {
          setDetailDesign(null);
          setStudioDesign(d);
          setIsStudioOpen(true);
        }}
      />
      <DesignStudioModal
        key={`studio-${studioDesign?.id ?? 'blank'}`}
        isOpen={isStudioOpen}
        onClose={() => {
          setIsStudioOpen(false);
          setStudioDesign(null);
        }}
        initialDesign={studioDesign}
      />
    </div>
  );
};