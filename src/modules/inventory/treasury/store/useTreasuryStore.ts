import { create } from 'zustand';
import { supabase } from '../../../../lib/supabase';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  businessUnit: string;
  paymentMethod: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  status?: string;
}

interface TreasuryState {
  transactions: Transaction[];
  isLoading: boolean;
  fetchTransactions: () => Promise<void>;
  addTransaction: (tx: any) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  // 1. Agregamos las funciones faltantes al "contrato" de TypeScript
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>;
  resolvePayment: (id: string) => Promise<void>;
}

export const useTreasuryStore = create<TreasuryState>((set, get) => ({
  transactions: [],
  isLoading: false,

  fetchTransactions: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('treasury')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error("❌ Error Supabase:", error.message);
        set({ isLoading: false });
        return;
      }

      set({ transactions: data || [], isLoading: false });
    } catch (err) {
      console.error("💥 Error:", err);
      set({ isLoading: false });
    }
  },

  addTransaction: async (tx) => {
    const { error } = await supabase.from('treasury').insert([tx]);
    if (error) throw error;
    await get().fetchTransactions();
  },

  deleteTransaction: async (id) => {
    const { error } = await supabase.from('treasury').delete().eq('id', id);
    if (error) throw error;
    await get().fetchTransactions();
  },

  // 2. Implementamos la lógica de actualización
  updateTransaction: async (id, data) => {
    const { error } = await supabase.from('treasury').update(data).eq('id', id);
    if (error) throw error;
    await get().fetchTransactions();
  },

  // 3. Implementamos la lógica de resolución rápida
  resolvePayment: async (id) => {
    // Pasa el estado a COMPLETADO (podés cambiar la palabra si usás 'PAGADO' o 'ACREDITADO' en tu BD)
    const { error } = await supabase.from('treasury').update({ status: 'COMPLETADO' }).eq('id', id);
    if (error) throw error;
    await get().fetchTransactions();
  }
}));