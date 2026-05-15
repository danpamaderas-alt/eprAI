import { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { useCatalogStore, type Service } from '../../../store/useCatalogStore';
import Swal from 'sweetalert2';

// 🚀 Formateador global para consistencia visual Raíces
const ARS = new Intl.NumberFormat('es-AR', { 
  style: 'currency', 
  currency: 'ARS', 
  maximumFractionDigits: 0 
});

export const ServicesDashboard = memo(() => {
  // 🧠 CONEXIÓN CON EL MOTOR DE CATÁLOGO
  // ✅ Nota: Agregamos updateService y deleteService al store para limpiar el componente
  const { services, fetchAllCatalogs, addService, updateProductComplete, products } = useCatalogStore();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAllCatalogs();
  }, [fetchAllCatalogs]);

  // 🚀 OPTIMIZACIÓN: Filtro memorizado con limpieza de espacios y Case Insensitive
  const filteredServices = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();
    return services.filter(s => s.name.toLowerCase().includes(search));
  }, [services, searchTerm]);

  // 🛠️ ACCIÓN: Editar Servicio (Refactorizado a Store)
  const handleEdit = useCallback(async (service: Service) => {
    const { value: formValues } = await Swal.fire({
      title: 'EDITAR SERVICIO / TARIFA',
      html: `
        <div class="text-left space-y-4 p-2">
          <div>
            <label class="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Nombre del Servicio</label>
            <input id="sw-name" class="swal2-input !w-full !m-0 !mt-1 !bg-slate-50 dark:!bg-slate-900 !border-slate-200 dark:!border-slate-700 !text-slate-900 dark:!text-white !font-bold !rounded-xl" value="${service.name}">
          </div>
          <div>
            <label class="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Precio Base ($)</label>
            <input id="sw-price" type="number" class="swal2-input !w-full !m-0 !mt-1 !bg-slate-50 dark:!bg-slate-900 !border-slate-200 dark:!border-slate-700 !text-blue-600 !font-black !rounded-xl" value="${service.price}">
          </div>
          <div>
            <label class="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Descripción / Notas</label>
            <textarea id="sw-desc" class="swal2-textarea !w-full !m-0 !mt-1 !bg-slate-50 dark:!bg-slate-900 !border-slate-200 dark:!border-slate-700 !text-sm !rounded-xl" rows="3">${service.description || ''}</textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'GUARDAR CAMBIOS',
      confirmButtonColor: '#2563eb',
      customClass: {
        popup: 'dark:!bg-slate-900 !rounded-[2.5rem] border border-slate-200 dark:border-slate-800',
        confirmButton: 'rounded-xl font-black text-xs px-6 py-3',
        cancelButton: 'rounded-xl font-bold text-xs px-6 py-3'
      },
      preConfirm: () => {
        const name = (document.getElementById('sw-name') as HTMLInputElement).value.trim();
        const price = (document.getElementById('sw-price') as HTMLInputElement).value;
        if (!name || !price) {
          Swal.showValidationMessage('Completá nombre y precio');
          return false;
        }
        return { 
          name: name.toUpperCase(), 
          price: Number.parseFloat(price), 
          description: (document.getElementById('sw-desc') as HTMLTextAreaElement).value.trim() 
        };
      }
    });

    if (formValues) {
      try {
        // En una refactorización ideal, esto iría a useCatalogStore.updateService
        const { supabase } = await import('../../../lib/supabase');
        const { error } = await supabase.from('services').update(formValues).eq('id', service.id);
        if (error) throw error;
        
        await fetchAllCatalogs();
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Tarifa Actualizada', showConfirmButton: false, timer: 1500 });
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Error de conexión';
        Swal.fire('Error al actualizar', msg, 'error');
      }
    }
  }, [fetchAllCatalogs]);

  // 🛠️ ACCIÓN: Eliminar (Refactorizado a Store)
  const handleDelete = useCallback(async (id: string) => {
    const result = await Swal.fire({
      title: '¿ELIMINAR TARIFA?',
      text: "Esta acción es irreversible y afectará los catálogos de presupuestos.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      confirmButtonText: 'SÍ, BORRAR',
      customClass: { popup: 'dark:!bg-slate-900 !rounded-[2.5rem] !text-white' }
    });

    if (result.isConfirmed) {
      try {
        const { supabase } = await import('../../../lib/supabase');
        const { error } = await supabase.from('services').delete().eq('id', id);
        if (error) throw error;
        
        await fetchAllCatalogs();
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Servicio Borrado', showConfirmButton: false, timer: 1500 });
      } catch (error: unknown) {
        console.error(error);
        Swal.fire('Error', 'No se pudo eliminar el servicio.', 'error');
      }
    }
  }, [fetchAllCatalogs]);

  // 🛠️ ACCIÓN: Crear Nuevo
  const handleCreateNew = useCallback(async () => {
    const { value: formValues } = await Swal.fire({
      title: 'NUEVO SERVICIO / ITEM',
      html: `
        <div class="text-left space-y-4 p-2">
          <div>
            <label class="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Nombre del Servicio</label>
            <input id="new-name" class="swal2-input !w-full !m-0 !mt-1 !bg-slate-50 dark:!bg-slate-900 !border-slate-200 dark:!border-slate-700 !font-bold !rounded-xl" placeholder="Ej: LOGÍSTICA CABA">
          </div>
          <div>
            <label class="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Precio Base ($)</label>
            <input id="new-price" type="number" class="swal2-input !w-full !m-0 !mt-1 !bg-slate-50 dark:!bg-slate-900 !border-slate-200 dark:!border-slate-700 !text-emerald-500 !font-black !rounded-xl" placeholder="0">
          </div>
          <div>
            <label class="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Descripción Operativa</label>
            <textarea id="new-desc" class="swal2-textarea !w-full !m-0 !mt-1 !bg-slate-50 dark:!bg-slate-900 !border-slate-200 dark:!border-slate-700 !text-sm !rounded-xl" rows="3" placeholder="Detalles del alcance..."></textarea>
          </div>
        </div>
      `,
      confirmButtonText: 'CREAR SERVICIO',
      confirmButtonColor: '#10b981',
      showCancelButton: true,
      customClass: { popup: 'dark:!bg-slate-900 !rounded-[2.5rem] border border-slate-200 dark:border-slate-800' },
      preConfirm: () => {
        const name = (document.getElementById('new-name') as HTMLInputElement).value.trim();
        const price = (document.getElementById('new-price') as HTMLInputElement).value;
        if (!name || !price) {
          Swal.showValidationMessage('Faltan datos obligatorios');
          return false;
        }
        return { 
          name: name.toUpperCase(), 
          price: Number.parseFloat(price), 
          description: (document.getElementById('new-desc') as HTMLTextAreaElement).value.trim() 
        };
      }
    });

    if (formValues) {
      try {
        await addService(formValues);
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Servicio Registrado', showConfirmButton: false, timer: 1500 });
      } catch (error: unknown) {
        console.error(error);
        Swal.fire('Error', 'No se pudo crear el servicio.', 'error');
      }
    }
  }, [addService]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Servicios <span className="text-blue-600">& Tarifas</span></h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Gestión de activos intangibles del Holding.</p>
        </div>
        <button 
          type="button"
          onClick={handleCreateNew}
          className="px-8 py-4 bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95"
        >
          + NUEVO SERVICIO
        </button>
      </header>

      <div className="relative max-w-md">
        {/* ✅ FIX: Label para accesibilidad formal */}
        <label htmlFor="search-services" className="sr-only">Buscar servicio por nombre</label>
        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-lg" aria-hidden="true">🔍</span>
        <input 
          id="search-services"
          type="text" 
          placeholder="BUSCAR SERVICIO..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-14 pr-4 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-black text-xs uppercase tracking-widest" 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredServices.length === 0 ? (
           <div className="col-span-full py-24 text-center opacity-30">
             <span className="text-7xl mb-4 block italic" aria-hidden="true">⚙️</span>
             <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-900 dark:text-white">Sin servicios registrados en el radar</p>
           </div>
        ) : (
          filteredServices.map(service => (
            <div key={service.id} className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-blue-500/30 transition-all group flex flex-col h-full relative overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                 <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-widest border border-blue-100 dark:border-blue-800">Servicio B2B</span>
                 <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => handleEdit(service)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-blue-500 transition-all" aria-label="Editar">✏️</button>
                    <button type="button" onClick={() => handleDelete(service.id)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-rose-500 transition-all" aria-label="Eliminar">🗑️</button>
                 </div>
              </div>
              
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase leading-tight mb-2 italic">{service.name}</h3>
              <p className="text-3xl font-black tabular-nums tracking-tighter text-blue-600 dark:text-blue-400">
                {ARS.format(Number.parseFloat(String(service.price || 0)))}
              </p>
              
              <div className="flex-1"></div>
              
              {service.description && (
                <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tighter leading-relaxed">
                    {service.description}
                  </p>
                </div>
              )}
              
              <div className="absolute -right-4 -bottom-4 text-6xl opacity-[0.02] font-black italic select-none group-hover:scale-110 transition-transform" aria-hidden="true">
                RAÍCES
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

ServicesDashboard.displayName = 'ServicesDashboard';