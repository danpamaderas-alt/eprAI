import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { useRawMaterialStore, type RawMaterial } from '../store/useRawMaterialStore';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { zodResolver } from '@hookform/resolvers/zod';
import Swal from 'sweetalert2';
import { Modal, FormField } from '../../../shared/components/ui/Modal';

const materialSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  category: z.string().min(1, "La categoria es obligatoria"),
  color: z.string().optional(),
  unit_measure: z.enum(["Metros", "Kilos", "Unidades", "Litros"]),
  composition: z.string().optional(),
  min_stock_alert: z.number().min(0).optional(),
  stock_quantity: z.number().min(0).optional(),
});
type MaterialForm = z.infer<typeof materialSchema>;

const stockAdjustSchema = z.object({
  newStock: z.number().min(0, "El stock no puede ser negativo"),
});
type StockAdjustForm = z.infer<typeof stockAdjustSchema>;

// 🚀 OPTIMIZACIÓN: Componente memorizado para evitar re-renders por cada tecla pulsada
export const RawMaterialDashboard = memo(() => {
  const { materials, isLoading, fetchMaterials, addMaterial, updateStock, deleteMaterial } = useRawMaterialStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('TODOS');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [stockModal, setStockModal] = useState<RawMaterial | null>(null);

  const createForm = useForm<MaterialForm>({
    resolver: zodResolver(materialSchema),
    defaultValues: { unit_measure: "Metros", min_stock_alert: 0, stock_quantity: 0 },
  });

  const stockForm = useForm<StockAdjustForm>({
    resolver: zodResolver(stockAdjustSchema),
  });

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  // 🧠 MEMORIA: Derivamos listas únicas para sugerencias
  const uniqueCategories = useMemo(() => Array.from(new Set(materials.map(m => m.category).filter(Boolean))), [materials]);

  const categories = useMemo(() => ['TODOS', ...uniqueCategories], [uniqueCategories]);

  // 🚀 OPTIMIZACIÓN: Filtrado memorizado Case Insensitive
  const filteredMaterials = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();
    return materials.filter(m => {
      const matchText = m.name.toLowerCase().includes(search) || 
                        (m.color?.toLowerCase().includes(search));
      const matchCat = filterCategory === 'TODOS' || m.category === filterCategory;
      return matchText && matchCat;
    });
  }, [materials, searchTerm, filterCategory]);

  const onSubmitMaterial = useCallback(async (data: MaterialForm) => {
    await addMaterial({ ...data, category: data.category.toUpperCase(), color: data.color?.toUpperCase() });
    setIsCreateModalOpen(false);
    createForm.reset();
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Insumo guardado', showConfirmButton: false, timer: 1500 });
  }, [addMaterial, createForm]);

  const openStockModal = useCallback((mat: RawMaterial) => {
    stockForm.reset({ newStock: mat.stock_quantity });
    setStockModal(mat);
  }, [stockForm]);

  const onSubmitStock = useCallback(async (data: StockAdjustForm) => {
    if (!stockModal) return;
    await updateStock(stockModal.id, data.newStock);
    setStockModal(null);
  }, [updateStock, stockModal]);

  if (isLoading) return <div className="p-8 h-screen flex items-center justify-center font-black text-slate-500 uppercase animate-pulse tracking-[0.5em]">Escaneando Insumos...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      
      <header className="flex flex-col md:flex-row justify-between items-center bg-slate-900 border border-slate-800 p-10 rounded-[3rem] shadow-2xl gap-6">
        <div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">⚙️ Control <span className="text-indigo-500">Insumos</span></h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-2">Catálogo Maestro de Materias Primas Raíces.</p>
        </div>
        <button 
          type="button"
          onClick={() => { createForm.reset({ unit_measure: "Metros", min_stock_alert: 0, stock_quantity: 0 }); setIsCreateModalOpen(true); }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-indigo-500/20 active:scale-95 transition-all"
        >
          + NUEVO REGISTRO
        </button>
      </header>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-[2rem] shadow-sm">
        <div className="relative flex-1 w-full">
          {/* ✅ FIX: Label para accesibilidad formal */}
          <label htmlFor="search-insumo" className="sr-only">Buscar por nombre o color</label>
          <input 
            id="search-insumo"
            type="text" 
            placeholder="Buscar por nombre o color..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white px-5 py-3 rounded-xl text-sm font-black uppercase placeholder-slate-400 outline-none focus:border-indigo-500 transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 scrollbar-hide">
          {categories.map((cat) => (
            <button 
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] whitespace-nowrap transition-all border ${filterCategory === cat ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-transparent hover:bg-slate-200'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                <th className="p-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Materia Prima</th>
                <th className="p-8 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Color / Composición</th>
                <th className="p-8 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Costo Unit.</th>
                <th className="p-8 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Stock Real</th>
                <th className="p-8 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {filteredMaterials.map((mat) => {
                const isLowStock = (mat.stock_quantity || 0) <= (mat.min_stock_alert || 0);

                return (
                  <tr key={mat.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                    <td className="p-8">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">{mat.category}</span>
                        <span className="font-black text-slate-900 dark:text-white uppercase text-sm">{mat.name}</span>
                      </div>
                    </td>
                    
                    <td className="p-8 text-center">
                      <div className="flex flex-col items-center gap-2">
                        {mat.color && <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 px-3 py-1 rounded-lg uppercase tracking-tight">{mat.color}</span>}
                        {mat.composition && <span className="text-[9px] font-bold text-slate-400 uppercase italic">{mat.composition}</span>}
                      </div>
                    </td>
                    
                    <td className="p-8 text-right">
                      <p className="font-black text-slate-900 dark:text-slate-200 text-lg">Stock: {mat.stock_quantity} {mat.unit_measure}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">por {mat.unit_measure}</p>
                    </td>
                    
                    <td className="p-8 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`text-3xl font-black tracking-tighter tabular-nums ${isLowStock ? 'text-rose-500 animate-pulse' : 'text-emerald-500'}`}>
                           {mat.stock_quantity}
                        </span>
                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{mat.unit_measure}</span>
                        {isLowStock && <span className="text-[8px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full uppercase mt-2 shadow-lg shadow-rose-500/30">STOCK CRÍTICO</span>}
                      </div>
                    </td>
                    
                    <td className="p-8 text-right">
                      <div className="flex items-center justify-end gap-3 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          type="button"
                          onClick={() => openStockModal(mat)}
                          className="bg-slate-900 dark:bg-slate-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                        >
                          ⚖️ AJUSTAR
                        </button>
                        <button 
                          type="button"
                          onClick={async () => {
                            const result = await Swal.fire({
                              title: '¿ELIMINAR INSUMO?',
                              text: `Se borrará "${mat.name}". Esta acción es irreversible.`,
                              icon: 'warning',
                              showCancelButton: true,
                              confirmButtonColor: '#e11d48',
                              confirmButtonText: 'SÍ, BORRAR',
                              customClass: { popup: '!bg-slate-900 !text-white !rounded-[2rem]' }
                            });
                            if (result.isConfirmed) deleteMaterial(mat.id);
                          }}
                          className="text-slate-300 hover:text-rose-500 p-2 transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredMaterials.length === 0 && (
            <div className="p-32 text-center">
              <span className="text-5xl opacity-10 block mb-4">⚙️</span>
              <p className="text-slate-400 font-black uppercase text-xs tracking-[0.5em] italic">Depósito Vacío o Búsqueda sin Coincidencias</p>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="NUEVO INSUMO"
        onSubmit={createForm.handleSubmit(onSubmitMaterial)}
        submitLabel="GUARDAR INSUMO"
        submitColor="bg-indigo-600 hover:bg-indigo-500"
        width="max-w-xl"
      >
        <FormField label="Nombre del Material">
          <input {...createForm.register("name")} className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" placeholder="Ej: Tela Pique" />
          {createForm.formState.errors.name && <p className="text-rose-500 text-[10px] font-bold mt-1">{createForm.formState.errors.name.message}</p>}
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Categoria">
            <input {...createForm.register("category")} className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" placeholder="Textiles, Avios..." />
            {createForm.formState.errors.category && <p className="text-rose-500 text-[10px] font-bold mt-1">{createForm.formState.errors.category.message}</p>}
          </FormField>
          <FormField label="Color">
            <input {...createForm.register("color")} className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" placeholder="Negro, Azul..." />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Unidad">
            <select {...createForm.register("unit_measure")} className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm">
              <option value="Metros">Metros</option>
              <option value="Kilos">Kilos</option>
              <option value="Unidades">Unidades</option>
              <option value="Litros">Litros</option>
            </select>
          </FormField>
          <FormField label="Composicion">
            <input {...createForm.register("composition")} className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" placeholder="Ej: 100% Algodon" />
          </FormField>
        </div>
        <FormField label="Alerta Stock Min.">
          <input type="number" {...createForm.register("min_stock_alert", { valueAsNumber: true })} className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" placeholder="5" />
        </FormField>
      </Modal>

      <Modal
        isOpen={!!stockModal}
        onClose={() => setStockModal(null)}
        title="AJUSTAR STOCK REAL"
        onSubmit={stockForm.handleSubmit(onSubmitStock)}
        submitLabel="ACTUALIZAR"
        submitColor="bg-indigo-600 hover:bg-indigo-500"
      >
        {stockModal && (
          <>
            <p className="text-sm font-bold text-slate-500 text-center mb-4">{stockModal.name} ({stockModal.color})</p>
            <FormField label={`Stock disponible en ${stockModal.unit_measure}`}>
              <input type="number" {...stockForm.register("newStock", { valueAsNumber: true })} className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-black text-2xl text-center outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
              {stockForm.formState.errors.newStock && <p className="text-rose-500 text-[10px] font-bold mt-1">{stockForm.formState.errors.newStock.message}</p>}
            </FormField>
          </>
        )}
      </Modal>
    </div>
  );
});

RawMaterialDashboard.displayName = 'RawMaterialDashboard';