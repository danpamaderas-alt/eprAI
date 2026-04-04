import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useCrmStore, type Customer } from '../store/useCrmStore';
import Swal from 'sweetalert2';

export const CrmDashboard = () => {
  const { customers, fetchCustomers, addCustomer, deleteCustomer, isLoading } = useCrmStore();
  const [showForm, setShowForm] = useState(false);

  // 1. Implementación de React Hook Form para un manejo de datos profesional
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<Omit<Customer, 'id' | 'createdAt'>>({
    defaultValues: {
      type: 'MINORISTA',
      name: '',
      phone: '',
      email: '',
      company: '',
      notes: ''
    }
  });

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const onSubmit = async (data: Omit<Customer, 'id' | 'createdAt'>) => {
    try {
      await addCustomer(data);
      setShowForm(false);
      reset();
    } catch{
      Swal.fire('Error', 'No se pudo guardar el cliente', 'error');
    }
  };

  const getBadgeStyle = (type: string) => {
    const styles: Record<string, string> = {
      GOBIERNO: 'bg-purple-50 text-purple-700 border-purple-200',
      MAYORISTA: 'bg-blue-50 text-blue-700 border-blue-200',
      MINORISTA: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
    return styles[type] || styles.MINORISTA;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* CABECERA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Directorio de Clientes</h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">Gestión de cartera y contactos comerciales.</p>
        </div>
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)} 
            className="group flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5"
          >
            <span className="text-xl group-hover:rotate-90 transition-transform duration-300">+</span>
            NUEVO CLIENTE
          </button>
        )}
      </div>

      {/* FORMULARIO DE ALTA */}
      {showForm && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl animate-in slide-in-from-top-6 duration-300">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                <input 
                  required 
                  type="text" 
                  placeholder="Ej: Juan Pérez"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-800"
                  {...register('name')}
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Cliente</label>
                <select 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all font-bold text-slate-800 appearance-none cursor-pointer"
                  {...register('type')}
                >
                  <option value="MINORISTA">Minorista (Showroom)</option>
                  <option value="MAYORISTA">Mayorista</option>
                  <option value="GOBIERNO">Entidad Gubernamental</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Empresa / Razón Social</label>
                <input 
                  type="text" 
                  placeholder="Opcional..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all font-semibold text-slate-700"
                  {...register('company')}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp / Teléfono</label>
                <input 
                  type="text" 
                  placeholder="+54..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all font-semibold text-slate-700"
                  {...register('phone')}
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
                <input 
                  type="email" 
                  placeholder="email@ejemplo.com"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all font-semibold text-slate-700"
                  {...register('email')}
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notas e Historial</label>
                <textarea 
                  placeholder="Detalles importantes sobre el cliente..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all font-medium text-slate-700 min-h-[100px]"
                  {...register('notes')}
                />
              </div>
            </div>

            <div className="flex gap-4 justify-end pt-4 border-t border-slate-100">
              <button 
                type="button" 
                onClick={() => setShowForm(false)} 
                className="px-6 py-3 rounded-xl font-black text-[11px] text-slate-500 uppercase tracking-widest hover:bg-slate-100 transition-colors"
              >
                Descartar
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="px-10 py-3 bg-slate-900 hover:bg-blue-600 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Guardando...' : 'Registrar Cliente'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* LISTADO DE CLIENTES */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden relative min-h-[400px]">
        {isLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/60 backdrop-blur-md">
            <svg className="animate-spin h-10 w-10 text-blue-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
        
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cliente</th>
                <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Información de Contacto</th>
                <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Categoría</th>
                <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400 text-xs shadow-inner">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-sm uppercase tracking-tight">{c.name}</p>
                        {c.company && <p className="text-[10px] font-bold text-blue-500 uppercase tracking-tighter">{c.company}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-xs font-bold text-slate-700 tabular-nums">{c.phone || 'S/T'}</p>
                    <p className="text-[10px] text-slate-400">{c.email || 'Sin correo'}</p>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2.5 py-1 text-[9px] font-black rounded-md border shadow-sm ${getBadgeStyle(c.type)}`}>
                      {c.type}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button 
                      onClick={() => deleteCustomer(c.id)} 
                      className="p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                      title="Eliminar cliente"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={4} className="py-20 text-center">
                     <span className="text-4xl mb-4 block">📇</span>
                     <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">El directorio está vacío</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};