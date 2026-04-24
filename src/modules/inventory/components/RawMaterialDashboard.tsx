import React, { useEffect, useState, useMemo } from 'react';
import { useRawMaterialStore } from '../store/useRawMaterialStore';
import Swal from 'sweetalert2';

export const RawMaterialDashboard = () => {
  const { materials, isLoading, fetchMaterials, addMaterial, updateStock, deleteMaterial } = useRawMaterialStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('TODOS');

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  // 🧠 MEMORIA INTELIGENTE PARA LOS DESPLEGABLES
  const uniqueCategories = useMemo(() => Array.from(new Set(materials.map(m => m.category).filter(Boolean))), [materials]);
  const uniqueColors = useMemo(() => Array.from(new Set(materials.map(m => m.color).filter(Boolean))), [materials]);
  const uniqueComps = useMemo(() => Array.from(new Set(materials.map(m => m.composition).filter(Boolean))), [materials]);

  // Filtros de la tabla
  const categories = useMemo(() => {
    return ['TODOS', ...uniqueCategories];
  }, [uniqueCategories]);

  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      const matchText = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (m.color && m.color.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCat = filterCategory === 'TODOS' || m.category === filterCategory;
      return matchText && matchCat;
    });
  }, [materials, searchTerm, filterCategory]);

  const handleNewMaterial = async () => {
    // Armamos las listas desplegables ocultas con lo que ya tenés en la base
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
          <input id="rm-name" class="swal2-input !w-full !m-0" placeholder="Nombre (Ej: Tela Piqué)">
          <div class="grid grid-cols-2 gap-3">
            <input id="rm-cat" list="cat-list" class="swal2-input !w-full !m-0" placeholder="Categoría (Elegir o Crear)">
            <input id="rm-color" list="col-list" class="swal2-input !w-full !m-0" placeholder="Color (Elegir o Crear)">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <input id="rm-comp" list="comp-list" class="swal2-input !w-full !m-0" placeholder="Composición (Elegir o Crear)">
            <select id="rm-unit" class="swal2-select !w-full !m-0 text-sm">
              <option value="Metros">Metros</option>
              <option value="Kilos">Kilos</option>
              <option value="Unidades">Unidades</option>
              <option value="Litros">Litros</option>
              <option value="Gramos">Gramos</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <input id="rm-cost" type="number" step="0.01" class="swal2-input !w-full !m-0" placeholder="Costo Unitario $">
            <input id="rm-alert" type="number" class="swal2-input !w-full !m-0" placeholder="Alerta Stock Mínimo">
          </div>
        </div>
      `,
      width: '600px',
      showCancelButton: true,
      confirmButtonText: 'GUARDAR',
      confirmButtonColor: '#4f46e5',
      customClass: { popup: '!bg-slate-900 !text-white !rounded-[2rem] border border-slate-800' },
      preConfirm: () => ({
        name: (document.getElementById('rm-name') as HTMLInputElement).value,
        category: (document.getElementById('rm-cat') as HTMLInputElement).value,
        color: (document.getElementById('rm-color') as HTMLInputElement).value,
        composition: (document.getElementById('rm-comp') as HTMLInputElement).value,
        unit_measure: (document.getElementById('rm-unit') as HTMLSelectElement).value,
        unit_cost: Number((document.getElementById('rm-cost') as HTMLInputElement).value) || 0,
        min_stock_alert: Number((document.getElementById('rm-alert') as HTMLInputElement).value) || 0,
        current_stock: 0
      })
    });

    if (form?.name && form?.category) {
      await addMaterial(form);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Insumo guardado', showConfirmButton: false, timer: 1500 });
    } else if (form) {
      Swal.fire('Error', 'El Nombre y la Categoría son obligatorios', 'error');
    }
  };

  const handleAdjustStock = async (mat: any) => {
    const { value: newStock } = await Swal.fire({
      title: 'Ajustar Stock',
      text: `${mat.name} (${mat.color})`,
      input: 'number',
      inputValue: mat.current_stock,
      inputLabel: `Stock actual en ${mat.unit_measure}`,
      showCancelButton: true,
      confirmButtonText: 'Actualizar',
      customClass: { popup: '!bg-slate-900 !text-white !rounded-3xl border border-slate-800' }
    });

    if (newStock !== undefined && newStock !== '') {
      await updateStock(mat.id, Number(newStock));
    }
  };

  if (isLoading) return <div className="p-8 text-white font-black uppercase tracking-widest animate-pulse">Cargando Insumos...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      <header className="flex justify-between items-center bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl">
        <div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">⚙️ GESTIÓN <span className="text-indigo-500">INSUMOS</span></h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">Catálogo maestro de materias primas.</p>
        </div>
        <button 
          onClick={handleNewMaterial} 
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-500/20 active:scale-95 transition-all"
        >
          + NUEVO REGISTRO
        </button>
      </header>

      <div className="flex gap-4 items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <input 
          type="text" 
          placeholder="Buscar insumo o color..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-xl w-64 text-sm font-bold outline-none focus:border-indigo-500"
        />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((cat: string) => (
            <button 
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${filterCategory === cat ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-xl">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-950/50 border-b border-slate-800">
              <th className="p-6 text-[10px] font-black uppercase text-slate-500 tracking-widest">Insumo</th>
              <th className="p-6 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Color / Detalle</th>
              <th className="p-6 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Costo Unit.</th>
              <th className="p-6 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Stock Actual</th>
              <th className="p-6 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filteredMaterials.map((mat: any) => {
              const isLowStock = mat.current_stock <= mat.min_stock_alert;

              return (
                <tr key={mat.id} className="hover:bg-white/5 transition-colors group">
                  <td className="p-6">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">{mat.category}</span>
                      <span className="font-black text-white uppercase text-sm">{mat.name}</span>
                    </div>
                  </td>
                  
                  <td className="p-6 text-center">
                    <div className="flex flex-col items-center gap-1">
                      {mat.color && <span className="text-xs font-bold text-slate-300 bg-slate-800 px-3 py-1 rounded-full uppercase">{mat.color}</span>}
                      {mat.composition && <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{mat.composition}</span>}
                    </div>
                  </td>
                  
                  <td className="p-6 text-right font-black text-slate-300">
                    ${Number(mat.unit_cost).toLocaleString()} <span className="text-[9px] text-slate-500 uppercase">/ {mat.unit_measure}</span>
                  </td>
                  
                  <td className="p-6 text-center">
                    <div className="flex flex-col items-center">
                      <span className={`text-2xl font-black tracking-tighter ${isLowStock ? 'text-rose-500 animate-pulse' : 'text-emerald-400'}`}>
                        {mat.current_stock}
                      </span>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{mat.unit_measure}</span>
                      {isLowStock && <span className="text-[8px] font-black bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded uppercase mt-1">Stock Bajo</span>}
                    </div>
                  </td>
                  
                  <td className="p-6 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleAdjustStock(mat)}
                        className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all"
                      >
                        ⚖️ Ajustar
                      </button>
                      <button 
                        onClick={async () => {
                          if((await Swal.fire({title: '¿Borrar?', icon: 'warning', showCancelButton:true, confirmButtonColor: '#e11d48'})).isConfirmed) {
                            deleteMaterial(mat.id);
                          }
                        }}
                        className="text-slate-600 hover:text-rose-500 p-2 transition-colors"
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
          <div className="p-20 text-center text-slate-600 font-black uppercase text-xs tracking-widest">
            Aún no hay insumos cargados o la búsqueda no coincide.
          </div>
        )}
      </div>
    </div>
  );
};