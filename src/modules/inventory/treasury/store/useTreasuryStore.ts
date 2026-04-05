import { create } from 'zustand';
// CORRECCIÓN 1: Ruta exacta al cliente de Supabase
import { supabase } from '../../../../lib/supabase'; 

interface Transaction {
  id: string;
  createdAt: string;
  date: string;
  amount: number;
  description: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  category: string;
  businessUnit: 'GENERAL' | 'RAICES' | 'RJ_CO' | 'BITA_IT' | 'ROJO_SHOWROOM' | 'UNIFORMES';
  paymentMethod: 'MERCADO_PAGO' | 'BANCO' | 'EFECTIVO';
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  user_id: string; 
}

interface TreasuryState {
  transactions: Transaction[];
  isLoading: boolean;
  fetchTransactions: () => Promise<void>;
  addTransaction: (formData: any) => Promise<{ success: boolean }>;
  deleteTransaction: (id: string) => Promise<void>;
  updateTransactionStatus: (id: string, status: string) => Promise<void>;
}

export const useTreasuryStore = create<TreasuryState>((set) => ({
  transactions: [],
  isLoading: false,

  fetchTransactions: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) throw error;
      set({ transactions: data || [], isLoading: false });
    } catch (error) {
      console.error('[Treasury Store] Error al cargar:', error);
      set({ isLoading: false });
    }
  },

  addTransaction: async (formData) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          amount: Number(formData.amount),
          description: formData.description,
          type: formData.type,
          category: formData.category,
          date: formData.date || new Date().toISOString(),
          businessUnit: formData.businessUnit,
          paymentMethod: formData.paymentMethod,
          status: 'COMPLETED'
        }])
        .select()
        .single();

      if (error) throw error;

      set((state) => ({ 
        transactions: [data, ...state.transactions] 
      }));

      return { success: true };
    } catch (error) {
      console.error("Error al grabar en la base de datos:", error);
      throw error;
    }
  },

  // Implementación de borrado (CORREGIDO: usa filter en lugar de map)
  deleteTransaction: async (id) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id)
    }));
  },

  // Implementación de cambio de estado (CORREGIDO: se agregó t => y el tipado de status)
  updateTransactionStatus: async (id, status) => {
    const validStatus = status as 'PENDING' | 'COMPLETED' | 'CANCELLED';
    const { error } = await supabase.from('transactions').update({ status: validStatus }).eq('id', id);
    if (error) throw error;
    
    set((state) => ({
      transactions: state.transactions.map((t) => 
        t.id === id ? { ...t, status: validStatus } : t
      )
    }));
  }
}));