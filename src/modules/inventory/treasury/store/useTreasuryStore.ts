import { create } from 'zustand';
import { supabase } from '../../../../lib/supabase';
import { type Transaction, type TransactionFormValues } from '../schemas/transactionSchema';

interface TreasuryState {
  transactions: Transaction[];
  isLoading: boolean;
  fetchTransactions: (limit?: number) => Promise<void>;
  addTransaction: (data: TransactionFormValues) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  updateTransactionStatus: (id: string, status: 'PENDING' | 'COMPLETED') => Promise<void>;
}

// Constante para evitar "Magic Strings" y facilitar mantenimiento
const TABLE_NAME = 'transactions';

export const useTreasuryStore = create<TreasuryState>((set) => ({
  transactions: [],
  isLoading: false,

  fetchTransactions: async (limit = 1000) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('id, type, amount, description, category, date, businessUnit, paymentMethod, status, createdAt')
        .order('date', { ascending: false })
        .limit(limit); // CRÍTICO CORREGIDO: Límite de seguridad para evitar OOM

      if (error) throw error;
      set({ transactions: (data as Transaction[]) || [], isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      console.error('[Treasury Store] Fetch critical failure:', error);
      throw error; // Propagación para que la UI maneje el error
    }
  },

  addTransaction: async (data) => {
    try {
      const { data: newRow, error } = await supabase
        .from(TABLE_NAME)
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      
      set((state) => ({ 
        transactions: [newRow as Transaction, ...state.transactions] 
      }));
    } catch (error) {
      console.error('[Treasury Store] Insert failure:', error);
      throw error;
    }
  },

  deleteTransaction: async (id) => {
    try {
      const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Sincronización: Solo filtramos si la DB confirmó el borrado
      set((state) => ({ 
        transactions: state.transactions.filter(t => t.id !== id) 
      }));
    } catch (error) {
      console.error('[Treasury Store] Delete failure:', error);
      throw error;
    }
  },

  updateTransactionStatus: async (id, status) => {
    try {
      const { error } = await supabase
        .from(TABLE_NAME)
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        transactions: state.transactions.map(t => 
          t.id === id ? { ...t, status } : t
        )
      }));
    } catch (error) {
      console.error('[Treasury Store] Status update failure:', error);
      throw error;
    }
  }
}));