import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { supabase } from '../../../lib/supabase'; // Asegurate de que esta ruta a Supabase sea correcta

const CUSTOMER_TYPES = [
  { id: 'MINORISTA', label: '👤 Minorista / Consumidor' },
  { id: 'MAYORISTA', label: '🏷️ Mayorista / Revendedor' },
  { id: 'INSTITUCION', label: '🏛️ Institución / Empresa' }
];

export const ClientFormModal = ({ isOpen, onClose, onSuccess }: any) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'MINORISTA',
    phone: '',
    email: '',
    address: '',
    cuit: '',
    notes: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      Swal.fire('Atención', 'El nombre del cliente es obligatorio', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      // Guardamos en la base de datos (Supabase)
      const { error } = await supabase.from('customers').insert([{
        name: formData.name,
        type: formData.type,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        cuit: formData.cuit || null,
        notes: formData.notes || null,
      }]);

      if (error) throw error;

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Cliente guardado',
        showConfirmButton: false,
        timer: 1500
      });
      
      onSuccess(); // Cierra el modal y actualiza la lista principal
      
    } catch (error: any) {
      console.error("Error guardando cliente:", error);
      Swal.fire('Error', 'No se pudo guardar el cliente en la base de datos.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* CABECERA */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10">
          <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
            Nuevo Cliente
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 bg-white dark:bg-slate-700 hover:bg-rose-50 rounded-full shadow-sm transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* FORMULARIO */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nombre / Razón Social *</label>
              <input 
                type="text" 
                required
                placeholder="Ej: Jorge Adrian Silva"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo de Cliente</label>
              <select 
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                {CUSTOMER_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">CUIT / DNI</label>
              <input 
                type="text" 
                placeholder="Opcional"
                value={formData.cuit}
                onChange={(e) => setFormData({...formData, cuit: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Teléfono / WhatsApp</label>
              <input 
                type="text" 
                placeholder="Ej: +54 9 221 555 1234"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Correo Electrónico</label>
              <input 
                type="email" 
                placeholder="cliente@correo.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Empresa / Negocio (Aparece en celeste)</label>
              <input 
                type="text" 
                placeholder="Ej: ROJO SHOWROOM"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Dirección de Entrega</label>
              <input 
                type="text" 
                placeholder="Calle, Número, Localidad"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            
          </div>

          {/* BOTÓN GUARDAR */}
          <div className="px-8 py-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 sticky bottom-0 z-10 -mx-8 -mb-8 mt-8">
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl text-xs font-black text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors uppercase tracking-widest"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-8 py-3 bg-blue-600 disabled:bg-slate-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-500/30 transition-all active:scale-95 uppercase tracking-widest"
            >
              {isSubmitting ? 'Guardando...' : '💾 Guardar Cliente'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};