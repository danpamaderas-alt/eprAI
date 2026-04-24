// src/modules/inventory/components/RawMaterialDashboard.tsx
import React, { useEffect } from 'react';
import { useRawMaterialStore, type RawMaterial } from '../store/useRawMaterialStore';
import Swal from 'sweetalert2';

export const RawMaterialDashboard = () => {
  const { materials, isLoading, fetchMaterials, addMaterial, updateMaterial, deleteMaterial, updateStock } = useRawMaterialStore();

  useEffect(() => { fetchMaterials(); }, [fetchMaterials]);

  // Formulario Reutilizable para Crear/Editar
  const openMaterialForm = async (existingMaterial?: RawMaterial) => {
    const { value: formValues } = await Swal.fire({
      title: existingMaterial ? 'EDITAR INSUMO' : 'REGISTRO TÉCNICO',
      html: `
        <div class="text-left space-y-4 mt-2 max-h-[60vh] overflow-y-auto px-2">
          <div>
            <label class="text-[10px] font-black uppercase text-slate-500 ml-1">Imagen (URL)</label>
            <input id="rm-img" class="swal2-input !w-full !m-0 !mt-1 !h-10 !bg-slate-950 !border-slate-800 !text-white !rounded-lg !text-xs" value="${existingMaterial?.image_url || ''}" placeholder="https://...">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <input id="rm-name" class="swal2-input !w-full !m-0 !mt-1 !h-10 !bg-slate-950 !border-slate-800 !text-white !rounded-lg !text-xs font-bold" value="${existingMaterial?.name || ''}" placeholder="Nombre">
            <input id="rm-color" class="swal2-input !w-full !m-0 !mt-1 !h-10 !bg-slate-950 !border-slate-800 !text-white !rounded-lg !text-xs font-bold" value="${existingMaterial?.color || ''}" placeholder="Color">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <input id="rm-brand" class="swal2-input !w-full !m-0 !mt-1 !h-10 !bg-slate-950 !border-slate-800 !text-white !rounded-lg !text-xs font-bold" value="${existingMaterial?.brand || ''}" placeholder="Marca">
            <input id="rm-code" class="swal2-input !w-full !m-0 !mt-1 !h-10 !bg-slate-950 !border-slate-800 !text-white !rounded-lg !text-xs font-bold" value="${existingMaterial?.supplier_code || ''}" placeholder="Código">
          </div>
          <div class="grid grid-cols-2 gap-3">
             <select id="rm-unit" class="swal2-input !w-full !m-0 !h-10 !bg-slate-950 !border-slate-800 !text-white !rounded-lg !text-xs">
                <option value="UNIDADES" ${existingMaterial?.unit_measure === 'UNIDADES' ? 'selected' : ''}>Unidades</option>
                <option value="METROS" ${existingMaterial?.unit_measure === 'METROS' ? 'selected' : ''}>Metros</option>
                <option value="KG" ${existingMaterial?.unit_measure === 'KG' ? 'selected' : ''}>Kilos</option>
             </select>
             <input id="rm-alert" type="number" class="swal2-input !w-full !m-0 !h-10 !bg-slate-950 !border-slate-800 !text-rose-400 !rounded-lg !text-center !font-black" value="${existingMaterial?.min_stock_alert || 5}">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: existingMaterial ? 'GUARDAR CAMBIOS' : 'CREAR INSUMO',
      buttonsStyling: false,
      customClass: {
        popup: '!bg-slate-900 !border !border-slate-800 !rounded-[2rem] !w-[32rem]',
        confirmButton: 'w-full bg-indigo-600 text-white font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-500/20 mb-2',
        cancelButton: 'w-full text-slate-500 font-black py-2 uppercase text-[9px] tracking-widest'
      },
      preConfirm: () => ({
        name: (document.getElementById('rm-name') as HTMLInputElement).value,
        color: (document.getElementById('rm-color') as HTMLInputElement).value,
        brand: (document.getElementById('rm-brand') as HTMLInputElement).value,
        supplier_code: (document.getElementById('rm-code') as HTMLInputElement).value,
        image_url: (document.getElementById('rm-img') as HTMLInputElement).value,
        min_stock_alert: Number((document.getElementById('rm-alert') as HTMLInputElement).value),
        unit_measure: (document.getElementById('rm-unit') as HTMLSelectElement).value,
        category: 'OTROS'
      })
    });

    if (formValues) {
      if (existingMaterial) await updateMaterial(existingMaterial.id, formValues);
      else await addMaterial(formValues);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const { isConfirmed } = await Swal.fire({
      title: '¿ELIMINAR INSUMO?',
      text: `Esta acción borrará "${name}" permanentemente.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'SÍ, BORRAR',
      cancelButtonText: 'CANCELAR',
      buttonsStyling: false,
      customClass: {
        popup: '!bg-slate-900 !border !border-slate-800 !rounded-[2rem]',
        confirmButton: 'bg-rose-600 text-white font-black px-8 py-4 rounded-2xl uppercase text-[10px] mr-2',
        cancelButton: 'bg-slate-800 text-slate-400 font-black px-8 py-4 rounded-2xl uppercase text-[10px]'
      }
    });

    if (isConfirmed) await deleteMaterial(id);
  };

  return (
    <div className="p-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">⚙️ Gestión <span className="text-indigo-500">Insumos</span></h1>
        <button onClick={() => openMaterialForm()} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-500/20 active:scale-95 transition-all">
          + Nuevo Registro
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {materials.map(mat => (
          <div key={mat.id} className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden group hover:border-indigo-500/50 transition-all shadow-xl relative">
            
            {/* MENÚ DE ACCIONES FLOTANTE */}
            <div className="absolute top-4 right-4 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => openMaterialForm(mat)} className="w-8 h-8 bg-black/60 backdrop-blur-md rounded-full text-white text-xs hover:bg-indigo-600 transition-colors">✏️</button>
              <button onClick={() => handleDelete(mat.id, mat.name)} className="w-8 h-8 bg-black/60 backdrop-blur-md rounded-full text-white text-xs hover:bg-rose-600 transition-colors">✕</button>
            </div>

            <div className="h-40 bg-slate-950 overflow-hidden">
              {mat.image_url ? (
                <img src={mat.image_url} alt={mat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[9px] text-slate-800 font-black uppercase tracking-[0.3em]">No Image</div>
              )}
            </div>

            <div className="p-6">
              <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-1 truncate">{mat.name}</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">{mat.color || 'Universal'} | {mat.brand || 'Genérico'}</p>
              
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <div>
                  <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Stock</p>
                  <p className={`text-2xl font-black tracking-tighter ${mat.stock_quantity <= mat.min_stock_alert ? 'text-rose-500' : 'text-emerald-400'}`}>
                    {mat.stock_quantity} <span className="text-[10px] text-slate-600">{mat.unit_measure}</span>
                  </p>
                </div>
                <button onClick={() => updateStock(mat.id, mat.stock_quantity + 1)} className="w-12 h-12 bg-slate-800 hover:bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl transition-all active:scale-90">+</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};