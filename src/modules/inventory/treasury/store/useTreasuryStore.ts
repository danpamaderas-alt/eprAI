import { create } from 'zustand';
import { supabase } from '../../../../lib/supabase'; 

export interface Transaction {
  id: string;
  created_at: string; // Ajustado al estándar de Supabase
  date: string;
  amount: number;
  description: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  category: string;
  businessUnit: 'GENERAL' | 'RAICES' | 'RJ_CO' | 'BITA_IT' | 'ROJO_SHOWROOM' | 'UNIFORMES';
  paymentMethod: 'MERCADO_PAGO' | 'BANCO' | 'EFECTIVO';
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  user_id?: string; 
}

interface TreasuryState {
  transactions: Transaction[];
  isLoading: boolean;
  fetchTransactions: () => Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addTransaction: (formData: any) => Promise<{ success: boolean }>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>; // 🔥 NUEVA FUNCIÓN DE EDICIÓN
  deleteTransaction: (id: string) => Promise<void>;
  updateTransactionStatus: (id: string, status: string) => Promise<void>;
  resolvePayment: (id: string, amountPaid: number, method: string) => Promise<void>;
}

export const useTreasuryStore = create<TreasuryState>((set, get) => ({
  transactions: [],
  isLoading: false,

  fetchTransactions: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false }); // Mejor ordenar por la fecha del comprobante que por creación

      if (error) throw error;
      set({ transactions: data as Transaction[] || [], isLoading: false });
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
          status: formData.status || 'COMPLETED'
        }])
        .select()
        .single();

      if (error) throw error;
      set((state) => ({ transactions: [data as Transaction, ...state.transactions] }));
      return { success: true };
    } catch (error) {
      console.error("[Treasury Store] Error al grabar en la base de datos:", error);
      throw error;
    }
  },

  // 🔥 LA MAGIA DE LA EDICIÓN: Permite corregir cualquier error humano
  updateTransaction: async (id, updates) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        transactions: state.transactions.map((t) => 
          t.id === id ? { ...t, ...updates } : t
        )
      }));
    } catch (error) {
      console.error('[Treasury Store] Error al actualizar:', error);
      throw error;
    }
  },

  deleteTransaction: async (id) => {
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) }));
    } catch (error) {
      console.error('[Treasury Store] Error al eliminar:', error);
      throw error;
    }
  },

  updateTransactionStatus: async (id, status) => {
    try {
      const validStatus = status as 'PENDING' | 'COMPLETED' | 'CANCELLED';
      const { error } = await supabase.from('transactions').update({ status: validStatus }).eq('id', id);
      if (error) throw error;
      set((state) => ({
        transactions: state.transactions.map((t) => t.id === id ? { ...t, status: validStatus } : t)
      }));
    } catch (error) {
      console.error('[Treasury Store] Error al cambiar estado:', error);
      throw error;
    }
  },

  // LA MAGIA DE PAGOS PARCIALES (Intacta y brillando)
  resolvePayment: async (id, amountPaid, method) => {
    try {
      const state = get();
      const tx = state.transactions.find(t => t.id === id);
      if (!tx) return;

      const remaining = tx.amount - amountPaid;

      if (remaining <= 0) {
        // PAGO TOTAL
        const { error } = await supabase.from('transactions')
          .update({ status: 'COMPLETED', paymentMethod: method }).eq('id', id);
        if (error) throw error;
        
        set((state) => ({
          transactions: state.transactions.map(t => 
            t.id === id ? { ...t, status: 'COMPLETED', paymentMethod: method as any } : t
          )
        }));
      } else {
        // PAGO PARCIAL
        const { error: updateError } = await supabase.from('transactions')
          .update({ amount: remaining }).eq('id', id);
        if (updateError) throw updateError;

        const { data: newTx, error: insertError } = await supabase.from('transactions').insert([{
          amount: amountPaid,
          description: tx.description + ' (Pago Parcial)',
          type: tx.type,
          category: tx.category,
          date: new Date().toISOString(),
          businessUnit: tx.businessUnit,
          paymentMethod: method,
          status: 'COMPLETED'
        }]).select().single();

        if (insertError) throw insertError;

        set((state) => ({
          transactions: [
            newTx as Transaction,
            ...state.transactions.map(t => t.id === id ? { ...t, amount: remaining } : t)
          ]
        }));
      }
    } catch (error) {
      console.error('[Treasury Store] Error al resolver pago:', error);
      throw error;
    }
  }
}));