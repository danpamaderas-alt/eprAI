import { create } from 'zustand';
import { supabase } from '../../../../lib/supabase';
import { useTenantStore } from '../../../../store/useTenantStore';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  businessUnit: string;
  paymentMethod: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  status?: 'PENDIENTE' | 'COMPLETADO' | 'CANCELADO';
}

interface TreasuryState {
  transactions: Transaction[];
  isLoading: boolean;
  fetchTransactions: () => Promise<void>;
  addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>;
  resolvePayment: (id: string) => Promise<void>;
}

export const useTreasuryStore = create<TreasuryState>((set, get) => ({
  transactions: [],
  isLoading: false,

  fetchTransactions: async () => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) return;

    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('treasury')
        .select('id, amount, type, date, description, category, business_unit, payment_method, status')
        .eq('company_id', companyId)
        .order('date', { ascending: false });

      if (error) {
        console.error("Error Supabase:", error.message);
        set({ isLoading: false });
        return;
      }

      set({ transactions: (data || []) as Transaction[], isLoading: false });
    } catch (err) {
      console.error("Error:", err);
      set({ isLoading: false });
    }
  },

  addTransaction: async (tx) => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) throw new Error('No hay company_id activo');
    const { error } = await supabase.from('treasury').insert([{ ...tx, company_id: companyId }]);
    if (error) throw error;
    await get().fetchTransactions();
  },

  deleteTransaction: async (id) => {
    const { error } = await supabase.from('treasury').delete().eq('id', id);
    if (error) throw error;
    await get().fetchTransactions();
  },

  updateTransaction: async (id, data) => {
    const { error } = await supabase.from('treasury').update(data).eq('id', id);
    if (error) throw error;
    await get().fetchTransactions();
  },

  resolvePayment: async (id) => {
    const { error } = await supabase.from('treasury').update({ status: 'COMPLETADO' }).eq('id', id);
    if (error) throw error;
    await get().fetchTransactions();
  }
}));