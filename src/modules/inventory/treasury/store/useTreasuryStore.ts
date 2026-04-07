import { create } from 'zustand';
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
          status: formData.status || 'COMPLETED'
        }])
        .select()
        .single();

      if (error) throw error;
      set((state) => ({ transactions: [data, ...state.transactions] }));
      return { success: true };
    } catch (error) {
      console.error("Error al grabar en la base de datos:", error);
      throw error;
    }
  },

  deleteTransaction: async (id) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
    set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) }));
  },

  updateTransactionStatus: async (id, status) => {
    const validStatus = status as 'PENDING' | 'COMPLETED' | 'CANCELLED';
    const { error } = await supabase.from('transactions').update({ status: validStatus }).eq('id', id);
    if (error) throw error;
    set((state) => ({
      transactions: state.transactions.map((t) => t.id === id ? { ...t, status: validStatus } : t)
    }));
  },

  // LA MAGIA NUEVA: Resolutor de pagos parciales/totales
  resolvePayment: async (id, amountPaid, method) => {
    const state = get();
    const tx = state.transactions.find(t => t.id === id);
    if (!tx) return;

    const remaining = tx.amount - amountPaid;

    if (remaining <= 0) {
      // PAGO TOTAL: Cambiamos estado y dónde entró la plata
      const { error } = await supabase.from('transactions')
        .update({ status: 'COMPLETED', paymentMethod: method }).eq('id', id);
      if (error) throw error;
      
      set((state) => ({
        transactions: state.transactions.map(t => 
          t.id === id ? { ...t, status: 'COMPLETED', paymentMethod: method as any } : t
        )
      }));
    } else {
      // PAGO PARCIAL: Achicamos la deuda original...
      const { error: updateError } = await supabase.from('transactions')
        .update({ amount: remaining }).eq('id', id);
      if (updateError) throw updateError;

      // ...y creamos un movimiento nuevo completado con la plata que entró
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
          newTx,
          ...state.transactions.map(t => t.id === id ? { ...t, amount: remaining } : t)
        ]
      }));
    }
  }
}));