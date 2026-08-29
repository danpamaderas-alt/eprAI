import { useEffect, useMemo, useState, useCallback } from 'react';
import { Plus, Search, Filter, FileDown, Palette } from 'lucide-react';
import Swal from 'sweetalert2';
import { useFilamentStore } from '../store/useFilamentStore';
import { FilamentCard } from '../components/FilamentCard';
import { FilamentFormModal } from '../components/FilamentFormModal';
import type { PrintFilament } from '../types';
import { FILAMENT_MATERIALS } from '../types';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { Spinner } from '../../../shared/components/ui/Spinner';
import { useToastStore } from '../../../store/useToastStore';

const MATERIAL_FILTERS = ['Todos', ...FILAMENT_MATERIALS] as const;

export const FilamentsPage = () => {
  const { filaments, isLoading, error, fetchFilaments, deleteFilament, consumeGrams } =
    useFilamentStore();
  const toast = useToastStore((s) => s.toast);

  const [searchTerm, setSearchTerm] = useState('');
  const [materialFilter, setMaterialFilter] = useState<string>('Todos');
  const [onlyLow, setOnlyLow] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFilament, setEditingFilament] = useState<PrintFilament | null>(null);

  useEffect(() => {
    fetchFilaments();
  }, [fetchFilaments]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return filaments.filter((f) => {
      if (materialFilter !== 'Todos' && f.material !== materialFilter) return false;
      if (onlyLow && f.remaining_g > (f.min_stock_g ?? 0)) return false;
      if (!term) return true;
      return (
        f.brand.toLowerCase().includes(term) ||
        (f.color_name?.toLowerCase().includes(term) ?? false) ||
        (f.provider?.toLowerCase().includes(term) ?? false)
      );
    });
  }, [filaments, searchTerm, materialFilter, onlyLow]);

  const kpis = useMemo(() => {
    const totalRemaining = filaments.reduce((acc, f) => acc + Math.max(0, f.remaining_g), 0);
    const lowCount = filaments.filter((f) => f.remaining_g <= (f.min_stock_g ?? 0)).length;
    const invested = filaments.reduce(
      (acc, f) => acc + (f.cost_per_kg ?? 0) * (Math.max(0, f.remaining_g) / 1000),
      0,
    );
    return { totalRemaining, lowCount, invested };
  }, [filaments]);

  const handleOpenForm = useCallback(() => {
    setEditingFilament(null);
    setIsFormOpen(true);
  }, []);

  const handleEdit = useCallback((filament: PrintFilament) => {
    setEditingFilament(filament);
    setIsFormOpen(true);
  }, []);

  const handleConsume = useCallback(
    (filament: PrintFilament) => {
      Swal.fire({
        title: 'Descontar gramos',
        text: `${filament.brand} ${filament.color_name ?? ''} · quedan ${Math.round(filament.remaining_g)}g`,
        input: 'number',
        inputValue: '',
        inputAttributes: { min: '1', step: '1' },
        showCancelButton: true,
        confirmButtonText: 'Descontar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#4f46e5',
      }).then(async (result) => {
        if (!result.isConfirmed) return;
        const grams = parseFloat(result.value ?? '');
        if (!Number.isFinite(grams) || grams <= 0) return;
        try {
          await consumeGrams(filament.id, grams);
          toast(`Se descontaron ${grams}g`, { type: 'success' });
        } catch (err) {
          console.error(err);
          toast('No se pudo descontar el stock', { type: 'error' });
        }
      });
    },
    [consumeGrams, toast],
  );

  const handleDelete = useCallback(
    (filament: PrintFilament) => {
      Swal.fire({
        title: '¿Eliminar este filamento?',
        text: `«${filament.brand} ${filament.color_name ?? ''}» se eliminará del inventario.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#e11d48',
      }).then(async (result) => {
        if (!result.isConfirmed) return;
        try {
          await deleteFilament(filament.id);
          toast('Filamento eliminado', { type: 'info' });
        } catch (err) {
          console.error(err);
          toast('No se pudo eliminar el filamento', { type: 'error' });
        }
      });
    },
    [deleteFilament, toast],
  );

  const exportCSV = useCallback(() => {
    const rows = [
      ['Marca', 'Material', 'Color', 'Rollo (g)', 'Restante (g)', 'Costo/kg', 'Costo rollo', 'Mínimo (g)', 'Proveedor'],
      ...filtered.map((f) => [
        f.brand,
        f.material,
        f.color_name ?? '',
        String(f.spool_weight_g),
        String(f.remaining_g),
        f.cost_per_kg != null ? String(f.cost_per_kg) : '',
        f.cost_per_kg != null ? String(Math.round((f.cost_per_kg / 1000) * (f.spool_weight_g || 1000))) : '',
        String(f.min_stock_g),
        f.provider ?? '',
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `filamentos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-600/30 shrink-0">
            <Palette size={28} className="text-white" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">
              Filamentos
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Inventario de rollos por color y material, con costo real por gramo.
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
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileDown className="w-3.5 h-3.5" aria-hidden="true" />
            CSV
          </button>
          <button
            type="button"
            onClick={handleOpenForm}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-600/30 transition-colors transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Nuevo Rollo
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0 font-black text-xs">kg</div>
          <div>
            <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">
              {(kpis.totalRemaining / 1000).toFixed(2)}
            </p>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 truncate">Kilos en stock</p>
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
            placeholder="Buscar por marca, color o proveedor..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus-visible:ring-2 focus-visible:ring-brand-500 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <Filter className="w-3.5 h-3.5" aria-hidden="true" />
            Material
          </span>
          <select
            value={materialFilter}
            onChange={(e) => setMaterialFilter(e.target.value)}
            className="px-3 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 focus-visible:ring-2 focus-visible:ring-brand-500 cursor-pointer"
          >
            {MATERIAL_FILTERS.map((m) => (
              <option key={m} value={m}>{m}</option>
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
          <Spinner size="lg" className="text-orange-500" />
        </div>
      ) : error ? (
        <div className="py-16 text-center">
          <p className="text-sm font-bold text-rose-500">{error}</p>
          <p className="text-xs text-slate-400 mt-1">
            Verificá que la tabla «print_filaments» exista en Supabase (migración sql/017_print_filaments.sql).
          </p>
        </div>
      ) : filaments.length === 0 ? (
        <EmptyState
          icon={<Palette className="w-8 h-8" />}
          title="Inventario de filamentos vacío"
          description="Cargá tus rollos con marca, color y costo por kg para calcular costos reales y saber cuándo reponer."
          action={
            <button
              type="button"
              onClick={handleOpenForm}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-widest transition-colors transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Agregar Rollo
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="w-8 h-8" />}
          title="Sin resultados"
          description="Ningún filamento coincide con los filtros actuales."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((f) => (
            <FilamentCard
              key={f.id}
              filament={f}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onConsume={handleConsume}
            />
          ))}
        </div>
      )}

      {/* MODAL */}
      <FilamentFormModal
        key={isFormOpen ? `form-${editingFilament?.id ?? 'new'}` : 'form-closed'}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingFilament(null);
        }}
        editingFilament={editingFilament}
      />
    </div>
  );
};
