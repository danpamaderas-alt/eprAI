import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { useRawMaterialStore, type RawMaterial } from '../store/useRawMaterialStore';
import Swal from 'sweetalert2';

// 🚀 OPTIMIZACIÓN: Componente memorizado para evitar re-renders por cada tecla pulsada en el buscador
export const RawMaterialDashboard = memo(() => {
  const { materials, isLoading, fetchMaterials, addMaterial, updateStock, deleteMaterial } = useRawMaterialStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('TODOS');

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  // 🧠 MEMORIA INTELIGENTE: Derivamos listas únicas para sugerencias sin recalcular en cada render
  const uniqueCategories = useMemo(() => Array.from(new Set(materials.map(m => m.category).filter(Boolean))), [materials]);
  const uniqueColors = useMemo(() => Array.from(new Set(materials.map(m => m.color).filter(Boolean))), [materials]);
  const uniqueComps = useMemo(() => Array.from(new Set(materials.map(m => m.composition).filter(Boolean))), [materials]);

  const categories = useMemo(() => ['TODOS', ...uniqueCategories], [uniqueCategories]);

  // 🚀 OPTIMIZACIÓN: Filtrado memorizado con lógica "Case Insensitive" avanzada
  const filteredMaterials = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();
    return materials.filter(m => {
      const matchText = m.name.toLowerCase().includes(search) || 
                        (m.color?.toLowerCase().includes(search));
      const matchCat = filterCategory === 'TODOS' || m.category === filterCategory;
      return matchText && matchCat;
    });
  }, [materials, searchTerm, filterCategory]);

  const handleNewMaterial = useCallback(async () => {
    const catOptions = uniqueCategories.map(c => `<option value="${c}">`).join('');
    const colOptions = uniqueColors.map(c => `<option value="${c}">`).join('');
    const compOptions = uniqueComps.map(c => `<option value="${c}">`).join('');

    const { value: form } = await Swal.fire({
      title: 'NUEVO INSUMO',
      html: `
        <datalist id="cat-list">${catOptions}</datalist>
        <datalist id="col-list">${colOptions}</datalist>
        <datalist id="comp-list">${compOptions}</datalist>
        <div class="flex flex-col gap-3 text-left">
          <label class="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Nombre del Material</label>
          <input id="rm-name" class="swal2-input !w-full !m-0 !rounded-xl dark:bg-slate-800 dark:text-white" placeholder="Ej: Tela Piqué">
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Categoría</label>
              <input id="rm-cat" list="cat-list" class="swal2-input !w-full !m-0 !rounded-xl dark:bg-slate-800 dark:text-white" placeholder="Textiles, Avios...">
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Color</label>
              <input id="rm-color" list="col-list" class="swal2-input !w-full !m-0 !rounded-xl dark:bg-slate-800 dark:text-white" placeholder="Negro, Azul...">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Unidad</label>
              <select id="rm-unit" class="swal2-select !w-full !m-0 !rounded-xl dark:bg-slate-800 dark:text-white text-sm">
                <option value="Metros">Metros</option>
                <option value="Kilos">Kilos</option>
                <option value="Unidades">Unidades</option>
                <option value="Litros">Litros</option>
              </select>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Composición</label>
              <input id="rm-comp" list="comp-list" class="swal2-input !w-full !m-0 !rounded-xl dark:bg-slate-800 dark:text-white" placeholder="Ej: 100% Algodón">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Costo Unitario ($)</label>
              <input id="rm-cost" type="number" step="0.01" class="swal2-input !w-full !m-0 !rounded-xl dark:bg-slate-800 dark:text-white" placeholder="0.00">
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Alerta Stock Mín.</label>
              <input id="rm-alert" type="number" class="swal2-input !w-full !m-0 !rounded-xl dark:bg-slate-800 dark:text-white" placeholder="5">
            </div>
          </div>
        </div>
      `,
      width: '600px',
      showCancelButton: true,
      confirmButtonText: 'GUARDAR INSUMO',
      confirmButtonColor: '#4f46e5',
      customClass: { popup: '!bg-white dark:!bg-slate-900 !rounded-[2.5rem] border border-slate-200 dark:border-slate-800' },
      preConfirm: () => ({
        name: (document.getElementById('rm-name') as HTMLInputElement).value.trim(),
        category: (document.getElementById('rm-cat') as HTMLInputElement).value.trim().toUpperCase(),
        color: (document.getElementById('rm-color') as HTMLInputElement).value.trim().toUpperCase(),
        composition: (document.getElementById('rm-comp') as HTMLInputElement).value.trim(),
        unit_measure: (document.getElementById('rm-unit') as HTMLSelectElement).value,
        unit_cost: Number((document.getElementById('rm-cost') as HTMLInputElement).value) || 0,
        min_stock_alert: Number((document.getElementById('rm-alert') as HTMLInputElement).value) || 0,
        current_stock: 0
      })
    });

    if (form?.name && form?.category) {
      await addMaterial(form);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Insumo guardado', showConfirmButton: false, timer: 1500 });
    }
  }, [uniqueCategories, uniqueColors, uniqueComps, addMaterial]);

  const handleAdjustStock = useCallback(async (mat: RawMaterial) => {
    const { value: newStock } = await Swal.fire({
      title: 'Ajustar Stock Real',
      text: `${mat.name} (${mat.color})`,
      input: 'number',
      inputValue: mat.current_stock,
      inputLabel: `Stock disponible en ${mat.unit_measure}`,
      showCancelButton: true,
      confirmButtonText: 'Actualizar',
      confirmButtonColor: '#4f46e5',
      customClass: { popup: '!bg-white dark:!bg-slate-900 !rounded-3xl border border-slate-200 dark:border-slate-800' }
    });

    if (newStock !== undefined && newStock !== '') {
      await updateStock(mat.id, Number(newStock));
    }
  }, [updateStock]);

  if (isLoading) return <div className="p-8 h-screen flex items-center justify-center font-black text-slate-500 uppercase animate-pulse tracking-[0.5em]">Escaneando Insumos...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      
      <header className="flex flex-col md:flex-row justify-between items-center bg-slate-900 border border-slate-800 p-10 rounded-[3rem] shadow-2xl gap-6">
        <div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">⚙️ Control <span className="text-indigo-500">Insumos</span></h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-2">Catálogo Maestro de Materias Primas Raíces.</p>
        </div>
        <button 
          onClick={handleNewMaterial} 
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-indigo-500/20 active:scale-95 transition-all"
        >
          + NUEVO REGISTRO
        </button>
      </header>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-[2rem] shadow-sm">
        <div className="relative flex-1 w-full">
          <input 
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
                const isLowStock = mat.current_stock <= (mat.min_stock_alert || 0);

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
                      <p className="font-black text-slate-900 dark:text-slate-200 text-lg">${Number(mat.unit_cost).toLocaleString('es-AR')}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">por {mat.unit_measure}</p>
                    </td>
                    
                    <td className="p-8 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`text-3xl font-black tracking-tighter tabular-nums ${isLowStock ? 'text-rose-500 animate-pulse' : 'text-emerald-500'}`}>
                          {mat.current_stock}
                        </span>
                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{mat.unit_measure}</span>
                        {isLowStock && <span className="text-[8px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full uppercase mt-2 shadow-lg shadow-rose-500/30">STOCK CRÍTICO</span>}
                      </div>
                    </td>
                    
                    <td className="p-8 text-right">
                      <div className="flex items-center justify-end gap-3 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleAdjustStock(mat)}
                          className="bg-slate-900 dark:bg-slate-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                        >
                          ⚖️ AJUSTAR
                        </button>
                        <button 
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
    </div>
  );
});

RawMaterialDashboard.displayName = 'RawMaterialDashboard';