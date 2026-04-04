import { create } from 'zustand';
import { supabase } from '../../../../lib/supabase';
import { type Transaction, type TransactionFormValues } from '../schemas/transactionSchema';
import Swal from 'sweetalert2';

interface TreasuryState {
  transactions: Transaction[];
  isLoading: boolean;
  fetchTransactions: () => Promise<void>;
  addTransaction: (data: TransactionFormValues) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  updateTransactionStatus: (id: string, status: Transaction['status']) => Promise<void>;
}

export const useTreasuryStore = create<TreasuryState>((set, get) => ({
  transactions: [],
  isLoading: false,

  // 1. DESCARGA: Con control de errores y limpieza de estado previo
  fetchTransactions: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      
      set({ transactions: data || [], isLoading: false });
    } catch (error: any) {
      console.error('🚨 Error Crítico en Descarga:', error.message);
      set({ isLoading: false });
      Swal.fire({
        title: 'Error de Sincronización',
        text: 'No pudimos obtener los movimientos de la nube.',
        icon: 'error',
        confirmButtonColor: '#3b82f6'
      });
    }
  },

  // 2. INSERCIÓN: Deja que la base de datos mande (Single Source of Truth)
  addTransaction: async (data) => {
    set({ isLoading: true });
    try {
      // Insertamos y pedimos que nos devuelva la fila creada (.select().single())
      const { data: newRow, error } = await supabase
        .from('transactions')
        .insert([{
          ...data,
          createdAt: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      // Actualizamos estado local con la respuesta REAL del servidor
      set((state) => ({ 
        transactions: [newRow, ...state.transactions],
        isLoading: false 
      }));

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Movimiento registrado correctamente',
        showConfirmButton: false,
        timer: 2000
      });
    } catch (error: any) {
      set({ isLoading: false });
      Swal.fire('Error al Guardar', error.message, 'error');
    }
  },

  // 3. ELIMINACIÓN: Con rollback manual en caso de error
  deleteTransaction: async (id) => {
    const originalTransactions = get().transactions;
    
    // Optimismo: Quitamos de la pantalla rápido
    set((state) => ({ 
      transactions: state.transactions.filter(t => t.id !== id) 
    }));

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      // Si falla en la nube, devolvemos los datos a la pantalla (Rollback)
      set({ transactions: originalTransactions });
      Swal.fire('Error al eliminar', 'El movimiento no pudo ser borrado de la base de datos.', 'error');
    }
  },

  // 4. ACTUALIZACIÓN: Blindaje de estados específicos
  updateTransactionStatus: async (id, status) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        transactions: state.transactions.map(t => 
          t.id === id ? { ...t, status } : t
        )
      }));
    } catch (error: any) {
      Swal.fire('Error de Actualización', error.message, 'error');
    }
  }
}));