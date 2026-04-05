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
  updateTransactionStatus: (id: string, status: 'PENDING' | 'COMPLETED') => Promise<void>;
}

export const useTreasuryStore = create<TreasuryState>((set) => ({
  transactions: [],
  isLoading: false,

  fetchTransactions: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false });
      if (error) throw error;
      set({ transactions: data || [], isLoading: false });
    } catch (error: unknown) {
      set({ isLoading: false });
      console.error('Error en fetch:', error instanceof Error ? error.message : 'Desconocido');
    }
  },

  addTransaction: async (data) => {
    try {
      const { data: newRow, error } = await supabase.from('transactions').insert([data]).select().single();
      if (error) throw error;
      set((state) => ({ transactions: [newRow, ...state.transactions] }));
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Guardado', showConfirmButton: false, timer: 1500 });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al guardar';
      Swal.fire('Error', msg, 'error');
    }
  },

  deleteTransaction: async (id) => {
    try {
      await supabase.from('transactions').delete().eq('id', id);
      set((state) => ({ transactions: state.transactions.filter(t => t.id !== id) }));
    } catch (error: unknown) {
      console.error('Error en delete:', error instanceof Error ? error.message : 'Desconocido');
    }
  },

  updateTransactionStatus: async (id, status) => {
    try {
      await supabase.from('transactions').update({ status }).eq('id', id);
      set((state) => ({
        transactions: state.transactions.map(t => t.id === id ? { ...t, status } : t)
      }));
    } catch (error: unknown) {
      console.error('Error en update status:', error instanceof Error ? error.message : 'Desconocido');
    }
  }
}));