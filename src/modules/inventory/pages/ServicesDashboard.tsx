import { useState, useMemo } from 'react';
import { useCatalogStore, type Service } from '../../../store/useCatalogStore';
import { supabase } from '../../../lib/supabase';
import Swal from 'sweetalert2';

export const ServicesDashboard = () => {
  const { services, fetchAllCatalogs, addService } = useCatalogStore();
  const [searchTerm, setSearchTerm] = useState('');

  // Filtro de búsqueda
  const filteredServices = useMemo(() => {
    return services.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [services, searchTerm]);

  // Función para Editar (CRUD)
  const handleEdit = async (service: Service) => {
    const { value: formValues } = await Swal.fire({
      title: 'Editar Servicio',
      html: `
        <div class="text-left space-y-4 mt-4">
          <div>
            <label class="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Nombre del Servicio</label>
            <input id="swal-name" class="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-bold outline-none focus:border-blue-500 transition-colors mt-1" placeholder="Ej: Matriz Bordado" value="${service.name}">
          </div>
          <div>
            <label class="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Precio Base ($)</label>
            <input id="swal-price" type="number" class="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-black tabular-nums outline-none focus:border-blue-500 transition-colors mt-1" placeholder="0" value="${service.price}">
          </div>
          <div>
            <label class="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Descripción / Notas</label>
            <textarea id="swal-desc" class="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-medium outline-none focus:border-blue-500 transition-colors mt-1" rows="3" placeholder="Detalles adicionales...">${service.description || ''}</textarea>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Guardar Cambios',
      cancelButtonText: 'Cancelar',
      customClass: {
        popup: 'dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 rounded-3xl',
        confirmButton: 'bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl px-6 py-3 transition-colors',
        cancelButton: 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-xl px-6 py-3 transition-colors'
      },
      preConfirm: () => {
        const name = (document.getElementById('swal-name') as HTMLInputElement).value;
        const price = (document.getElementById('swal-price') as HTMLInputElement).value;
        if (!name || !price) {
          Swal.showValidationMessage('El nombre y el precio son obligatorios');
          return false;
        }
        return {
          name,
          price: Number(price),
          description: (document.getElementById('swal-desc') as HTMLTextAreaElement).value
        }
      }
    });

    if (formValues) {
      try {
        const { error } = await supabase.from('services').update(formValues).eq('id', service.id);
        if (error) throw error;
        await fetchAllCatalogs(); // Refrescamos la lista global
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Servicio Actualizado', showConfirmButton: false, timer: 1500 });
      } catch {
        Swal.fire('Error', 'No se pudo actualizar el servicio en la base de datos.', 'error');
      }
    }
  };

  // Función para Eliminar
  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar servicio?',
      text: "Esta acción no se puede deshacer.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      customClass: {
        popup: 'dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 rounded-3xl',
        confirmButton: 'font-black rounded-xl px-6 py-3 transition-colors',
        cancelButton: 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-xl px-6 py-3 transition-colors'
      }
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase.from('services').delete().eq('id', id);
        if (error) throw error;
        await fetchAllCatalogs();
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Servicio Eliminado', showConfirmButton: false, timer: 1500 });
      } catch {
        Swal.fire('Error', 'No se pudo eliminar. Verifique su conexión.', 'error');
      }
    }
  };

  // Función para Crear Nuevo
  const handleCreateNew = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Nuevo Servicio',
      html: `
        <div class="text-left space-y-4 mt-4">
          <div>
            <label class="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Nombre del Servicio</label>
            <input id="new-name" class="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-bold outline-none focus:border-blue-500 transition-colors mt-1" placeholder="Ej: Logística a CABA">
          </div>
          <div>
            <label class="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Precio Base ($)</label>
            <input id="new-price" type="number" class="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-black tabular-nums outline-none focus:border-blue-500 transition-colors mt-1" placeholder="0">
          </div>
          <div>
            <label class="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Descripción (Opcional)</label>
            <textarea id="new-desc" class="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-medium outline-none focus:border-blue-500 transition-colors mt-1" rows="3" placeholder="Detalles..."></textarea>
          </div>
        </div>
      `,
      confirmButtonText: 'Crear Servicio',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      customClass: {
        popup: 'dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 rounded-3xl',
        confirmButton: 'bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl px-6 py-3 transition-colors',
        cancelButton: 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-xl px-6 py-3 transition-colors'
      },
      preConfirm: () => {
        const name = (document.getElementById('new-name') as HTMLInputElement).value;
        const price = (document.getElementById('new-price') as HTMLInputElement).value;
        if (!name || !price) {
          Swal.showValidationMessage('Completá el nombre y el precio');
          return false;
        }
        return {
          name,
          price: Number(price),
          description: (document.getElementById('new-desc') as HTMLTextAreaElement).value
        }
      }
    });

    if (formValues) {
      try {
        await addService(formValues);
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Servicio Creado', showConfirmButton: false, timer: 1500 });
      } catch {
        Swal.fire('Error', 'Hubo un problema al crear el servicio.', 'error');
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors duration-300">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight transition-colors italic">Servicios y Tarifas</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-widest mt-1 transition-colors">Gestión de intangibles (Logística, Matrices, Diseño).</p>
        </div>
        <button 
          onClick={handleCreateNew}
          className="px-6 py-3 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg transition-all active:scale-95"
        >
          + Nuevo Servicio
        </button>
      </header>

      {/* BARRA DE BÚSQUEDA */}
      <div className="relative max-w-md">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">🔍</span>
        <input 
          type="text" 
          placeholder="Buscar servicio por nombre..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl shadow-sm outline-none focus:border-blue-500 transition-all font-medium" 
        />
      </div>

      {/* GRILLA DE SERVICIOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredServices.length === 0 ? (
           <div className="col-span-full py-20 text-center opacity-40">
             <span className="text-6xl mb-4 block" aria-hidden="true">🛠️</span>
             <p className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">No se encontraron servicios</p>
           </div>
        ) : (
          filteredServices.map(service => (
            <div key={service.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-500/50 transition-all duration-300 group flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                 <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-widest transition-colors">Servicio</span>
                 <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(service)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors" aria-label="Editar">✏️</button>
                    <button onClick={() => handleDelete(service.id)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors" aria-label="Eliminar">🗑️</button>
                 </div>
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase leading-tight mb-1 transition-colors">{service.name}</h3>
              <p className="text-2xl font-black tabular-nums tracking-tighter text-slate-900 dark:text-white transition-colors">
                ${service.price.toLocaleString('es-AR')}
              </p>
              
              <div className="flex-1"></div>
              
              {service.description && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-4 font-medium italic border-t border-slate-100 dark:border-slate-700 pt-3 transition-colors">
                  {service.description}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};