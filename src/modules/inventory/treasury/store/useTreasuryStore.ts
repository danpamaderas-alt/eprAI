import { create } from 'zustand';
import { supabase } from '../../../../lib/supabase'; 

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  category: string;
  businessUnit: string;
  paymentMethod: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
}

interface TreasuryState {
  transactions: Transaction[];
  isLoading: boolean;
  fetchTransactions: () => Promise<void>;
  addTransaction: (formData: any) => Promise<{ success: boolean }>;
  deleteTransaction: (id: string) => Promise<void>;
}

export const useTreasuryStore = create<TreasuryState>((set, get) => ({
  transactions: [],
  isLoading: false,

  fetchTransactions: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('treasury') // ⬅️ CAMBIADO A 'treasury'
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      
      // Mapeamos los nombres de la base de datos a los que usa tu código
      const mapped = data?.map(t => ({
        ...t,
        businessUnit: t.business_unit,
        paymentMethod: t.payment_method
      }));

      set({ transactions: mapped as Transaction[] || [], isLoading: false });
    } catch (error) {
      console.error('[Treasury Store] Error:', error);
      set({ isLoading: false });
    }
  },

  addTransaction: async (formData) => {
    try {
      const { data, error } = await supabase
        .from('treasury') // ⬅️ CAMBIADO A 'treasury'
        .insert([{
          amount: Number(formData.amount),
          description: formData.description,
          type: formData.type,
          category: formData.category,
          date: formData.date || new Date().toISOString(),
          business_unit: formData.businessUnit, // ⬅️ Ajuste de nombre
          payment_method: formData.paymentMethod, // ⬅️ Ajuste de nombre
          status: formData.status || 'COMPLETED'
        }])
        .select()
        .single();

      if (error) throw error;
      
      const newTx = { ...data, businessUnit: data.business_unit, paymentMethod: data.payment_method };
      set((state) => ({ transactions: [newTx as Transaction, ...state.transactions] }));
      return { success: true };
    } catch (error) {
      console.error("[Treasury Store] Error al grabar:", error);
      throw error;
    }
  },

  deleteTransaction: async (id) => {
    try {
      const { error } = await supabase.from('treasury').delete().eq('id', id);
      if (error) throw error;
      set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) }));
    } catch (error) {
      console.error('[Treasury Store] Error al eliminar:', error);
      throw error;
    }
  }
}));