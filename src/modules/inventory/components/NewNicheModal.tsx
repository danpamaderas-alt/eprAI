import { useState, useEffect, useRef, useCallback, memo } from 'react';
import Swal from 'sweetalert2';
import { supabase } from '../../../lib/supabase';
import { useTenantStore } from '../../../store/useTenantStore';

interface NewNicheModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNicheAdded: () => void;
}

export const NewNicheModal = memo(({ isOpen, onClose, onNicheAdded }: NewNicheModalProps) => {
  const [nicheName, setNicheName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 🚀 OPTIMIZACIÓN: Foco de precisión y gestión de eventos globales
  useEffect(() => {
    if (isOpen) {
      setNicheName('');
      
      // requestAnimationFrame asegura que el modal ya se pintó antes de pedir el foco
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });

      const handleGlobalKeys = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };

      document.addEventListener('keydown', handleGlobalKeys);
      return () => document.removeEventListener('keydown', handleGlobalKeys);
    }
  }, [isOpen, onClose]);

  // 🚀 OPTIMIZACIÓN: Memorizamos el guardado para proteger el ciclo de vida
  const handleSave = useCallback(async () => {
    const cleanName = nicheName.trim();
    if (!cleanName || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Generamos un slug seguro eliminando caracteres especiales
      const slug = cleanName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '');

      const { error } = await supabase
        .from('niches')
        .insert([{ 
          name: cleanName.toUpperCase(), 
          slug: slug
        }]);

      if (error) throw error;

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Unidad de Negocio creada',
        showConfirmButton: false,
        timer: 1500
      });

      onNicheAdded();
      onClose();
    } catch (error: unknown) {
      console.error('Error al guardar el nicho:', error);
      const msg = error instanceof Error ? error.message : 'Error de conexión con Supabase';
      Swal.fire('Error de Registro', msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [nicheName, isSubmitting, onNicheAdded, onClose]);

  // Manejador para guardar al presionar Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      onMouseDown={onClose}
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200"
    >
      <div 
        onMouseDown={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95 duration-200"
      >
        <header className="mb-8">
          <p className="text-[10px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-[0.4em] mb-1">Estructura Holding</p>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">
            ✨ Nueva Unidad
          </h3>
        </header>
        
        <div className="space-y-6">
          <div>
            {/* ✅ FIX: Label asociado formalmente al input por ID */}
            <label htmlFor="niche-name" className="block text-slate-400 text-[10px] font-black mb-2 uppercase tracking-widest ml-1">
              Nombre del Nicho / Categoría
            </label>
            <input 
              id="niche-name"
              ref={inputRef}
              type="text" 
              value={nicheName}
              onChange={(e) => setNicheName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ej: CALZADO, GORRAS..."
              disabled={isSubmitting}
              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 text-slate-900 dark:text-white font-black uppercase placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all shadow-inner"
            />
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <button 
              type="button"
              onClick={handleSave}
              disabled={isSubmitting || !nicheName.trim()}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 transition-all active:scale-95"
            >
              {isSubmitting ? 'GUARDANDO...' : 'CONFIRMAR ALTA'}
            </button>
            <button 
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full py-3 text-slate-400 hover:text-rose-500 transition-colors font-black text-[10px] uppercase tracking-widest"
            >
              CANCELAR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

NewNicheModal.displayName = 'NewNicheModal';