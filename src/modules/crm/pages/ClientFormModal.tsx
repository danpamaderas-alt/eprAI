import { useState, useEffect, useRef, useCallback, memo } from 'react';
import Swal from 'sweetalert2';
import { supabase } from '../../../lib/supabase';

const CUSTOMER_TYPES = [
  { id: 'MINORISTA', label: '👤 Minorista / Consumidor' },
  { id: 'MAYORISTA', label: '🏷️ Mayorista / Revendedor' },
  { id: 'INSTITUCION', label: '🏛️ Institución / Empresa' }
];

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const INITIAL_STATE = {
  name: '',
  type: 'MINORISTA',
  phone: '',
  email: '',
  address: '',
  cuit: '',
  notes: ''
};

export const ClientFormModal = memo(({ isOpen, onClose, onSuccess }: ClientFormModalProps) => {
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // 🚀 OPTIMIZACIÓN: Gestión de Focus y Ciclo de Vida
  useEffect(() => {
    if (isOpen) {
      setFormData(INITIAL_STATE);
      
      // requestAnimationFrame es más eficiente que setTimeout para el DOM
      requestAnimationFrame(() => {
        nameInputRef.current?.focus();
      });

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // 🚀 OPTIMIZACIÓN: Memorizamos el envío para proteger la memoria
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      Swal.fire({ icon: 'warning', title: 'Atención', text: 'El nombre del cliente es obligatorio.' });
      nameInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      // 🧹 NORMALIZACIÓN: Limpieza extrema de datos antes de Supabase
      const cleanData = {
        name: formData.name.trim().toUpperCase(),
        type: formData.type,
        phone: formData.phone.trim() || null,
        email: formData.email.trim().toLowerCase() || null,
        address: formData.address.trim() || null,
        cuit: formData.cuit.trim() || null,
        notes: formData.notes.trim() || null,
        balance: 0 
      };

      const { error } = await supabase.from('customers').insert([cleanData]);
      if (error) throw error;

      await Swal.fire({
        icon: 'success',
        title: '¡Cliente Registrado!',
        text: `${cleanData.name} se agregó con éxito.`,
        timer: 1500,
        showConfirmButton: false,
        background: '#0f172a',
        color: '#fff'
      });

      onSuccess();
      onClose();
    } catch (error: unknown) {
      console.error('[ClientForm Error]:', error);
      const msg = error instanceof Error ? error.message : 'Fallo en la red';
      Swal.fire('Error al guardar', msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onClose, onSuccess]);

  if (!isOpen) return null;

  return (
    <div 
      onMouseDown={onClose}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div 
        onMouseDown={(e) => e.stopPropagation()} 
        className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200"
      >
        
        {/* HEADER HOLDING STYLE */}
        <div className="px-8 pt-8 pb-4 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">
              Nuevo Cliente
            </h2>
            <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-1">
              Registro de Base de Datos Raíces
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-full transition-all"
            aria-label="Cerrar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-4">
          
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nombre / Razón Social *</label>
            <input 
              ref={nameInputRef}
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
              placeholder="Ej: JORGE ADRIAN SILVA"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Categoría</label>
              <select 
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white cursor-pointer"
              >
                {CUSTOMER_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">CUIT / DNI</label>
              <input 
                type="text"
                value={formData.cuit}
                onChange={(e) => setFormData({...formData, cuit: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                placeholder="Sin guiones"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">WhatsApp</label>
              <input 
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                placeholder="+54 9..."
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email</label>
              <input 
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                placeholder="ejemplo@correo.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Dirección / Localidad</label>
            <input 
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              placeholder="Calle, Altura, Ciudad"
            />
          </div>

          <div className="flex justify-end gap-3 pt-6">
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl text-xs font-black text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors uppercase tracking-widest active:scale-95"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-2xl text-xs font-black shadow-xl shadow-blue-600/20 transition-all active:scale-95 uppercase tracking-widest"
            >
              {isSubmitting ? 'Cargando...' : '💾 Guardar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

ClientFormModal.displayName = 'ClientFormModal';