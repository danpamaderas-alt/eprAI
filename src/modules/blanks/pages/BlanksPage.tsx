import { useEffect, useMemo, useState, useCallback } from 'react';
import { Plus, Search, Filter, FileDown, PackageOpen } from 'lucide-react';
import Swal from 'sweetalert2';
import { useBlankStore } from '../store/useBlankStore';
import { BlankCard } from '../components/BlankCard';
import { BlankFormModal } from '../components/BlankFormModal';
import type { TextileBlank } from '../types';
import { BLANK_TYPES } from '../types';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { Spinner } from '../../../shared/components/ui/Spinner';
import { useToastStore } from '../../../store/useToastStore';

const TYPE_FILTERS = ['Todos', ...BLANK_TYPES] as const;

export const BlanksPage = () => {
  const { blanks, isLoading, error, fetchBlanks, deleteBlank, adjustStock } = useBlankStore();
  const toast = useToastStore((s) => s.toast);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('Todos');
  const [onlyLow, setOnlyLow] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBlank, setEditingBlank] = useState<TextileBlank | null>(null);

  useEffect(() => {
    fetchBlanks();
  }, [fetchBlanks]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return blanks.filter((b) => {
      if (typeFilter !== 'Todos' && b.type !== typeFilter) return false;
      if (onlyLow && b.stock_qty > (b.min_stock ?? 0)) return false;
      if (!term) return true;
      return (
        b.name.toLowerCase().includes(term) ||
        (b.size?.toLowerCase().includes(term) ?? false) ||
        (b.color?.toLowerCase().includes(term) ?? false) ||
        (b.provider?.toLowerCase().includes(term) ?? false)
      );
    });
  }, [blanks, searchTerm, typeFilter, onlyLow]);

  const kpis = useMemo(() => {
    const totalUnits = blanks.reduce((acc, b) => acc + Math.max(0, b.stock_qty), 0);
    const lowCount = blanks.filter((b) => b.stock_qty <= (b.min_stock ?? 0)).length;
    const invested = blanks.reduce((acc, b) => acc + b.cost_price * Math.max(0, b.stock_qty), 0);
    return { totalUnits, lowCount, invested };
  }, [blanks]);

  const handleOpenForm = useCallback(() => {
    setEditingBlank(null);
    setIsFormOpen(true);
  }, []);

  const handleEdit = useCallback((blank: TextileBlank) => {
    setEditingBlank(blank);
    setIsFormOpen(true);
  }, []);

  const handleAdjust = useCallback(
    (blank: TextileBlank, delta: number) => {
      adjustStock(blank.id, delta).catch((err) => {
        console.error(err);
        toast('No se pudo ajustar el stock', { type: 'error' });
      });
    },
    [adjustStock, toast],
  );

  const handleDelete = useCallback(
    (blank: TextileBlank) => {
      Swal.fire({
        title: '¿Eliminar este blank?',
        text: `«${blank.name}» se eliminará del inventario.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#e11d48',
      }).then(async (result) => {
        if (!result.isConfirmed) return;
        try {
          await deleteBlank(blank.id);
          toast('Blank eliminado', { type: 'info' });
        } catch (err) {
          console.error(err);
          toast('No se pudo eliminar el blank', { type: 'error' });
        }
      });
    },
    [deleteBlank, toast],
  );

  const exportCSV = useCallback(() => {
    const rows = [
      ['Nombre', 'Tipo', 'Talle/Medida', 'Color', 'Proveedor', 'Costo c/u', 'Stock', 'Mínimo'],
      ...filtered.map((b) => [
        b.name,
        b.type,
        b.size ?? '',
        b.color ?? '',
        b.provider ?? '',
        String(b.cost_price),
        String(b.stock_qty),
        String(b.min_stock),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blanks-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-fuchsia-600 to-pink-600 flex items-center justify-center shadow-lg shadow-fuchsia-600/30 shrink-0">
            <PackageOpen size={28} className="text-white" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">
              Blanks e Insumos
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Productos vírgenes para sublimar: costo unitario real y control de reposición.
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
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-300 hover:text-fuchsia-600 dark:hover:text-fuchsia-400 text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileDown className="w-3.5 h-3.5" aria-hidden="true" />
            CSV
          </button>
          <button
            type="button"
            onClick={handleOpenForm}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-fuchsia-600/30 transition-colors transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Nuevo Blank
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0 font-black text-xs">Σ</div>
          <div>
            <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{kpis.totalUnits}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 truncate">Unidades en stock</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-black text-xs ${kpis.lowCount > 0 ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
            !
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{kpis.lowCount}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 truncate">A reponer</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 font-black text-xs">$</div>
          <div>
            <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">
              ${Math.round(kpis.invested).toLocaleString('es-AR')}
            </p>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 truncate">Valorizado a costo</p>
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
            placeholder="Buscar por nombre, talle, color o proveedor..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus-visible:ring-2 focus-visible:ring-brand-500 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <Filter className="w-3.5 h-3.5" aria-hidden="true" />
            Tipo
          </span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 focus-visible:ring-2 focus-visible:ring-brand-500 cursor-pointer"
          >
            {TYPE_FILTERS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyLow}
              onChange={(e) => setOnlyLow(e.target.checked)}
              className="accent-rose-600 w-3.5 h-3.5"
            />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Solo a reponer</span>
          </label>
        </div>
      </div>

      {/* CONTENIDO */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" className="text-fuchsia-500" />
        </div>
      ) : error ? (
        <div className="py-16 text-center">
          <p className="text-sm font-bold text-rose-500">{error}</p>
          <p className="text-xs text-slate-400 mt-1">
            Verificá que la tabla «textile_blanks» exista en Supabase (migración sql/018_textile_blanks.sql).
          </p>
        </div>
      ) : blanks.length === 0 ? (
        <EmptyState
          icon={<PackageOpen className="w-8 h-8" />}
          title="Inventario de blanks vacío"
          description="Cargá tus tazas, remeras y tumblers vírgenes con proveedor y costo para presupuestar con números reales."
          action={
            <button
              type="button"
              onClick={handleOpenForm}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black text-xs uppercase tracking-widest transition-colors transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Agregar Blank
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="w-8 h-8" />}
          title="Sin resultados"
          description="Ningún blank coincide con los filtros actuales."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((b) => (
            <BlankCard
              key={b.id}
              blank={b}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAdjust={handleAdjust}
            />
          ))}
        </div>
      )}

      {/* MODAL */}
      <BlankFormModal
        key={isFormOpen ? `form-${editingBlank?.id ?? 'new'}` : 'form-closed'}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingBlank(null);
        }}
        editingBlank={editingBlank}
      />
    </div>
  );
};
