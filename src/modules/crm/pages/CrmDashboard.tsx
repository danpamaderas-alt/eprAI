import { useState, useMemo, useEffect } from 'react';
import { useCrmStore, type Customer } from '../store/useCrmStore';
import { supabase } from '../../../lib/supabase';
import Swal from 'sweetalert2';

// Importamos el generador y la tarjeta
import { generateGiftMessage, type MessageTone } from '../utils/giftHelper';
import { GiftCardPrintable } from '../components/GiftCardPrintable';

const CUSTOMER_TYPES = [
  { id: 'MINORISTA', label: '👤 Minorista / Consumidor', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  { id: 'MAYORISTA', label: '🏷️ Mayorista / Revendedor', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  { id: 'INSTITUCION', label: '🏛️ Institución / Empresa', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800' }
];

export const CrmDashboard = () => {
  const { customers, fetchCustomers, isLoading } = useCrmStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editForm, setEditForm] = useState<any>({});

  // ✅ ESTADO PARA LA TARJETA DE REGALO 3D
  const [printMessage, setPrintMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    return customers.filter((c: any) => {
      const searchLower = searchTerm.toLowerCase();
      const matchText = c.name?.toLowerCase().includes(searchLower) || c.phone?.includes(searchTerm) || c.email?.toLowerCase().includes(searchLower);
      const matchType = filterType === '' || c.type === filterType;
      return matchText && matchType;
    });
  }, [customers, searchTerm, filterType]);

  const openCreateModal = () => {
    setModalMode('create');
    setEditForm({ name: '', phone: '', email: '', type: 'MINORISTA', cuit: '', address: '', notes: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setModalMode('edit');
    setEditForm({ ...customer });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditForm({});
  };

  const handleSave = async () => {
    if (!editForm.name) {
      Swal.fire('Atención', 'El nombre del cliente es obligatorio', 'warning');
      return;
    }

    try {
      const payload = {
        name: editForm.name,
        phone: editForm.phone || null,
        email: editForm.email || null,
        type: editForm.type || 'MINORISTA',
        cuit: editForm.cuit || null, 
        address: editForm.address || null,
        notes: editForm.notes || null,
      };

      if (modalMode === 'create') {
        const { error } = await supabase.from('customers').insert([payload]);
        if (error) throw error;
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Cliente registrado', showConfirmButton: false, timer: 1500 });
      } else {
        const { error } = await supabase.from('customers').update(payload).eq('id', editForm.id);
        if (error) throw error;
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Cliente actualizado', showConfirmButton: false, timer: 1500 });
      }
      
      fetchCustomers();
      closeModal();
    } catch (err: any) {
      console.error("Error al guardar:", err);
      Swal.fire('Error', err.message || 'Hubo un problema al guardar en la base de datos.', 'error');
    }
  };

  const handleDelete = async (customer: Customer) => {
    const result = await Swal.fire({
      title: '¿Eliminar Cliente?',
      text: `Se borrará a "${customer.name}". No podrás deshacer esto.`,
      icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#f43f5e', cancelButtonColor: '#64748b', confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar',
      customClass: { popup: 'dark:bg-slate-900 rounded-3xl dark:text-white' }
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase.from('customers').delete().eq('id', customer.id);
        if (error) throw error;
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Cliente eliminado', showConfirmButton: false, timer: 1500 });
        fetchCustomers();
      } catch (err) {
        Swal.fire('Error', 'No se pudo eliminar. Verifica que no tenga pedidos asociados.', 'error');
      }
    }
  };

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length > 8) {
      window.open(`https://wa.me/${cleanPhone}`, '_blank');
    } else {
      Swal.fire('Atención', 'El número de teléfono no parece válido', 'warning');
    }
  };

  // ✅ FUNCIÓN DE REGALO CONSTRUCTORA DEL MENSAJE 3D
  const handleGiftClick = async (customerName: string) => {
    const { value: formValues } = await Swal.fire({
      title: '🎁 REGALO DE FIDELIZACIÓN',
      html: `
        <div class="text-left space-y-4 p-2">
          <div>
            <label class="text-[10px] font-black uppercase text-slate-400 tracking-widest">¿Qué le vas a regalar?</label>
            <input id="gift-name" class="swal2-input !w-full !m-0 !mt-1 !rounded-xl dark:bg-slate-800 dark:text-white" placeholder="Ej: Juego Pass the Pigs 3D">
          </div>
          <div>
            <label class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tono del Mensaje</label>
            <select id="gift-tone" class="swal2-input !w-full !m-0 !mt-1 !rounded-xl dark:bg-slate-800 dark:text-white">
              <option value="Amigo">Amistoso (Cercano y casual)</option>
              <option value="Formal">Formal (Corporativo e institucional)</option>
              <option value="Breve">Breve (Directo y al grano)</option>
            </select>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'GENERAR TARJETA',
      cancelButtonText: 'CANCELAR',
      customClass: { 
        popup: 'dark:bg-slate-900 rounded-3xl', 
        confirmButton: 'bg-emerald-600 rounded-xl font-black text-xs px-6 py-3',
        cancelButton: 'bg-slate-700 rounded-xl font-black text-xs px-6 py-3'
      },
      preConfirm: () => {
        const gift = (document.getElementById('gift-name') as HTMLInputElement).value;
        const tone = (document.getElementById('gift-tone') as HTMLSelectElement).value as MessageTone;
        if (!gift) { Swal.showValidationMessage('Ingresá el nombre del regalo'); return false; }
        return { gift, tone };
      }
    });

    if (formValues) {
      // Ponemos a cargar el Swal para que el usuario sepa que la IA está pensando
      Swal.fire({
        title: '✨ Creando mensaje con IA...',
        text: 'Escribiendo algo único para tu cliente',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading() }
      });

      try {
        // Ahora usamos "await" porque la función es asíncrona
        const msg = await generateGiftMessage(customerName, formValues.gift, formValues.tone);
        Swal.close(); // Cerramos el cartel de carga
        setPrintMessage(msg); // Mostramos la tarjeta terminada
      } catch (e) {
        Swal.close();
        Swal.fire('Error', 'Hubo un problema generando el texto', 'error');
      }
        }
  };

  const getInitials = (name: string) => name ? name.charAt(0).toUpperCase() : '?';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight italic">Directorio CRM</h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest mt-1">Gestión de Clientes y Contactos</p>
        </div>
        
        <button 
          onClick={openCreateModal}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
          Nuevo Cliente
        </button>
      </header>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">🔍</div>
          <input 
            type="text" placeholder="Buscar por Nombre, Teléfono o Email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-white outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="min-w-[180px] px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 outline-none">
            <option value="">TODAS LAS CATEGORÍAS</option>
            {CUSTOMER_TYPES.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex justify-center text-slate-400 font-bold text-sm uppercase tracking-widest animate-pulse">Cargando Directorio...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-800 m-8 rounded-3xl bg-slate-50/50 dark:bg-slate-900/50">
            <span className="text-4xl block mb-2 opacity-50">📇</span>
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest">No hay clientes registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <th className="py-5 px-6">Cliente / Organización</th>
                  <th className="py-5 px-6">Información de Contacto</th>
                  <th className="py-5 px-6">Categoría</th>
                  <th className="py-5 px-6 text-center">Gestión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filteredCustomers.map((c: any) => {
                  const typeInfo = CUSTOMER_TYPES.find(t => t.id === c.type) || CUSTOMER_TYPES[0];

                  return (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors group">
                      <td className="py-4 px-6 align-middle">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-black text-lg flex-shrink-0">
                            {getInitials(c.name)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-slate-900 dark:text-white text-sm uppercase leading-tight">{c.name}</span>
                            {c.notes && <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-0.5">{c.notes}</span>}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6 align-middle">
                        <div className="flex flex-col space-y-1.5">
                          {c.phone ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{c.phone}</span>
                              <button onClick={() => openWhatsApp(c.phone)} className="text-[9px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 flex items-center hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors">
                                💬 WA
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">S/T (Sin teléfono)</span>
                          )}
                          {c.email ? (
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{c.email}</span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Sin correo</span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-6 align-middle">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-md tracking-widest border ${typeInfo.color}`}>
                            {typeInfo.id}
                          </span>
                        </div>
                      </td>
                      
                      <td className="py-4 px-6 text-center align-middle">
                        <div className="flex items-center justify-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          
                          {/* ✅ NUEVO BOTÓN: REGALO 3D */}
                          <button onClick={() => handleGiftClick(c.name)} className="px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 text-emerald-600 text-[10px] font-black rounded-lg transition-all uppercase border border-emerald-200 dark:border-emerald-800 shadow-sm" title="Regalo Fidelización">🎁</button>

                          <button onClick={() => openEditModal(c)} className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-blue-600 text-[10px] font-black rounded-lg transition-all uppercase border border-slate-200 dark:border-slate-700 shadow-sm" title="Editar Cliente">✏️</button>
                          <button onClick={() => handleDelete(c)} className="px-3 py-2 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 text-rose-600 text-[10px] font-black rounded-lg transition-all uppercase border border-rose-200 dark:border-rose-800 shadow-sm" title="Eliminar Cliente">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE EDICIÓN / CREACIÓN */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10">
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                {modalMode === 'create' ? 'Nuevo Cliente' : 'Editar Cliente'}
              </h2>
              <button onClick={closeModal} className="p-2 text-slate-400 hover:text-rose-500 bg-white dark:bg-slate-700 hover:bg-rose-50 rounded-full shadow-sm transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nombre / Razón Social *</label>
                  <input type="text" placeholder="Ej: Jorge Adrian Silva" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" required />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo de Cliente</label>
                  <select value={editForm.type || 'MINORISTA'} onChange={e => setEditForm({...editForm, type: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none">
                    {CUSTOMER_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">CUIT / DNI</label>
                  <input type="text" placeholder="Opcional" value={editForm.cuit || ''} onChange={e => setEditForm({...editForm, cuit: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Teléfono / WhatsApp</label>
                  <input type="text" placeholder="Ej: +54 9 221 555 1234" value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Correo Electrónico</label>
                  <input type="email" placeholder="cliente@correo.com" value={editForm.email || ''} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Empresa / Negocio (Aparece en celeste)</label>
                  <input type="text" placeholder="Ej: ROJO SHOWROOM" value={editForm.notes || ''} onChange={e => setEditForm({...editForm, notes: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Dirección de Entrega</label>
                  <input type="text" placeholder="Calle, Número, Localidad" value={editForm.address || ''} onChange={e => setEditForm({...editForm, address: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
            </div>

            <div className="px-8 py-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 sticky bottom-0 z-10">
              <button onClick={closeModal} className="px-6 py-3 rounded-xl text-xs font-black text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors uppercase tracking-widest">
                Cancelar
              </button>
              <button onClick={handleSave} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-500/30 transition-all active:scale-95 uppercase tracking-widest">
                {modalMode === 'create' ? 'Guardar Cliente' : 'Actualizar Datos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ EL COMPONENTE DE LA TARJETA SE RENDERIZA ACÁ */}
      {printMessage && (
        <GiftCardPrintable 
          message={printMessage} 
          onClose={() => setPrintMessage(null)} 
        />
      )}

    </div>
  );
};