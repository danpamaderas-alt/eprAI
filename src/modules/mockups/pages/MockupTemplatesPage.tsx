import { useEffect, useMemo, useState, useCallback } from 'react';
import { Plus, Search, FileDown, Frame } from 'lucide-react';
import Swal from 'sweetalert2';
import { useMockupTemplateStore } from '../store/useMockupTemplateStore';
import { MockupTemplateCard } from '../components/MockupTemplateCard';
import { MockupTemplateFormModal } from '../components/MockupTemplateFormModal';
import type { MockupTemplate } from '../types';
import { TEMPLATE_PRODUCT_TYPES } from '../types';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { Spinner } from '../../../shared/components/ui/Spinner';
import { useToastStore } from '../../../store/useToastStore';

const TYPE_FILTERS = ['Todos', ...TEMPLATE_PRODUCT_TYPES] as const;

export const MockupTemplatesPage = () => {
  const { templates, isLoading, error, fetchTemplates, deleteTemplate } =
    useMockupTemplateStore();
  const toast = useToastStore((s) => s.toast);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('Todos');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MockupTemplate | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return templates.filter((t) => {
      if (typeFilter !== 'Todos' && t.product_type !== typeFilter) return false;
      if (!term) return true;
      return (
        t.name.toLowerCase().includes(term) ||
        (t.notes?.toLowerCase().includes(term) ?? false)
      );
    });
  }, [templates, searchTerm, typeFilter]);

  const withoutArea = useMemo(
    () => templates.filter((t) => t.print_area_width_mm == null || t.print_area_height_mm == null).length,
    [templates],
  );

  const handleOpenForm = useCallback(() => {
    setEditingTemplate(null);
    setIsFormOpen(true);
  }, []);

  const handleEdit = useCallback((template: MockupTemplate) => {
    setEditingTemplate(template);
    setIsFormOpen(true);
  }, []);

  const handleDelete = useCallback(
    (template: MockupTemplate) => {
      Swal.fire({
        title: '¿Eliminar esta plantilla?',
        text: `«${template.name}» se eliminará del repositorio.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#e11d48',
      }).then(async (result) => {
        if (!result.isConfirmed) return;
        try {
          await deleteTemplate(template.id);
          toast('Plantilla eliminada', { type: 'info' });
        } catch (err) {
          console.error(err);
          toast('No se pudo eliminar la plantilla', { type: 'error' });
        }
      });
    },
    [deleteTemplate, toast],
  );

  const exportCSV = useCallback(() => {
    const rows = [
      ['Nombre', 'Tipo de producto', 'Ancho (mm)', 'Alto (mm)', 'Notas'],
      ...filtered.map((t) => [
        t.name,
        t.product_type,
        t.print_area_width_mm != null ? String(t.print_area_width_mm) : '',
        t.print_area_height_mm != null ? String(t.print_area_height_mm) : '',
        t.notes ?? '',
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plantillas-mockup-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-600/30 shrink-0">
            <Frame size={28} className="text-white" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">
              Mockups Base
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Plantillas por producto con el área de impresión exacta en milímetros.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              if (filtered.length === 0) return;
              exportCSV();
              toast('CSV generado', { type: 'success' });
            }}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileDown className="w-3.5 h-3.5" aria-hidden="true" />
            CSV
          </button>
          <button
            type="button"
            onClick={handleOpenForm}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-sky-600/30 transition-colors transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Nueva Plantilla
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0 font-black text-xs">
            {templates.length}
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">Plantillas</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 truncate">En el repositorio</p>
          </div>
        </div>
        <div className={`bg-white dark:bg-slate-900 rounded-3xl border p-4 flex items-center gap-3 ${withoutArea > 0 ? 'border-amber-400/40' : 'border-slate-200 dark:border-slate-800'}`}>
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-black text-xs ${withoutArea > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
            !
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{withoutArea}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 truncate">Sin área definida</p>
          </div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o notas..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus-visible:ring-2 focus-visible:ring-brand-500 transition-colors"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 focus-visible:ring-2 focus-visible:ring-brand-500 cursor-pointer"
        >
          {TYPE_FILTERS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* CONTENIDO */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" className="text-sky-500" />
        </div>
      ) : error ? (
        <div className="py-16 text-center">
          <p className="text-sm font-bold text-rose-500">{error}</p>
          <p className="text-xs text-slate-400 mt-1">
            Verificá que la tabla «mockup_templates» exista en Supabase (migración sql/019_mockup_templates.sql).
          </p>
        </div>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={<Frame className="w-8 h-8" />}
          title="Repositorio de plantillas vacío"
          description="Cargá la base de cada producto con su área de impresión en mm para generar mockups precisos para WhatsApp."
          action={
            <button
              type="button"
              onClick={handleOpenForm}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs uppercase tracking-widest transition-colors transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Agregar Plantilla
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="w-8 h-8" />}
          title="Sin resultados"
          description="Ninguna plantilla coincide con los filtros actuales."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((t) => (
            <MockupTemplateCard key={t.id} template={t} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* MODAL */}
      <MockupTemplateFormModal
        key={isFormOpen ? `form-${editingTemplate?.id ?? 'new'}` : 'form-closed'}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTemplate(null);
        }}
        editingTemplate={editingTemplate}
      />
    </div>
  );
};
