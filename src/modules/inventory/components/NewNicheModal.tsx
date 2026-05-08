import React, { useState } from 'react';
import { supabase } from '../../../../lib/supabase'; // Ajustá la ruta según tu proyecto

interface NewNicheModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNicheAdded: () => void; // Función para recargar la lista
}

export const NewNicheModal = ({ isOpen, onClose, onNicheAdded }: NewNicheModalProps) => {
  const [nicheName, setNicheName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!nicheName.trim()) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('niches')
        .insert([{ 
          name: nicheName.toUpperCase(), 
          slug: nicheName.toLowerCase().replace(/\s+/g, '-') 
        }]);

      if (error) throw error;

      onNicheAdded(); // Avisa que se agregó para recargar la lista
      setNicheName('');
      onClose(); // Cierra el modal
    } catch (error) {
      console.error('Error al guardar el nicho:', error);
      alert('Hubo un error al guardar el nicho.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-lg p-6 w-full max-w-sm border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          ✨ NUEVO NICHO
        </h3>
        
        <div className="mb-6">
          <label className="block text-slate-400 text-sm mb-2 uppercase tracking-wider">
            Nombre del Nicho
          </label>
          <input 
            type="text" 
            value={nicheName}
            onChange={(e) => setNicheName(e.target.value)}
            placeholder="Ej: CAMPERAS, ACCESORIOS..."
            className="w-full bg-slate-800 border border-slate-700 rounded p-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            CANCELAR
          </button>
          <button 
            onClick={handleSave}
            disabled={isSubmitting || !nicheName.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:text-slate-400 text-white rounded transition-colors"
          >
            {isSubmitting ? 'GUARDANDO...' : 'CONFIRMAR'}
          </button>
        </div>
      </div>
    </div>
  );
};