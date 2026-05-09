import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { supabase } from '../../../lib/supabase'; // Asegurate de que esta ruta a Supabase sea correcta

const CUSTOMER_TYPES = [
  { id: 'MINORISTA', label: '👤 Minorista / Consumidor' },
  { id: 'MAYORISTA', label: '🏷️ Mayorista / Revendedor' },
  { id: 'INSTITUCION', label: '🏛️ Institución / Empresa' }
];

// 1. 🛡️ CHAU ANY: Definimos la interfaz estricta para los props
interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ClientFormModal: React.FC<ClientFormModalProps> = ({ isOpen, onClose, onSuccess }) => {
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
  // Ref para manejar el focus automático
  const nameInputRef = useRef<HTMLInputElement>(null);

  // 2. 🪄 EFECTOS UX: Escape para cerrar y Autofocus al abrir
  useEffect(() => {
    if (isOpen) {
      // Le da foco al input de nombre apenas abre (con un pequeño delay para que termine la animación)
      setTimeout(() => nameInputRef.current?.focus(), 100);
      
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación de espacios vacíos (usando trim)
    if (!formData.name.trim()) {
      Swal.fire('Atención', 'El nombre del cliente es obligatorio', 'warning');
      // Le devolvemos el foco al usuario
      nameInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      // 3. 🧹 FILTRO ANTI-BASURA: Usamos trim() en todos los campos de texto
      // Así evitamos guardar "   " en la base de datos
      const cleanData = {
        name: formData.name.trim(),
        type: formData.type,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        cuit: formData.cuit.trim() || null,
        notes: formData.notes.trim() || null,
      };

      const { error } = await supabase.from('customers').insert([cleanData]);

      if (error) throw error;

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Cliente guardado',
        showConfirmButton: false,
        timer: 1500
      });
      
      // Reseteamos el formulario al salir para que esté limpio la próxima vez
      setFormData({ name: '', type: 'MINORISTA', phone: '', email: '', address: '', cuit: '', notes: '' });
      onSuccess(); 
      
    } catch (error: any) {
      console.error("Error guardando cliente:", error);
      Swal.fire('Error', 'No se pudo guardar el cliente en la base de datos.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // 4. 🖱️ CIERRE AL CLIC AFUERA: onMouseDown en el fondo oscuro
    <div 
      onMouseDown={onClose} 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      {/* Detenemos la propagación del clic para que no se cierre si hace clic adentro de la tarjeta blanca */}
      <div 
        onMouseDown={(e) => e.stopPropagation()} 
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
      >
        
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
        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nombre / Razón Social *</label>
              <input 
                ref={nameInputRef} // Acá conectamos la referencia para el Autofocus
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