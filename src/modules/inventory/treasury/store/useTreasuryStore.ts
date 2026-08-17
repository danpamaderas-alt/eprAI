import { create } from 'zustand';
import { supabase } from '../../../../lib/supabase';
import { useTenantStore } from '../../../../store/useTenantStore';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  business_unit?: string;
  businessUnit?: string;
  payment_method?: string;
  paymentMethod?: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  amount: number;
  status?: string;
  notes?: string;
  company_id?: string;
}

interface TreasuryState {
  transactions: Transaction[];
  isLoading: boolean;
  fetchTransactions: () => Promise<void>;
  addTransaction: (tx: Omit<Transaction, 'id' | 'company_id'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>;
  resolvePayment: (id: string) => Promise<void>;
  transferBetweenAccounts: (from: string, to: string, amount: number, description: string) => Promise<void>;
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
        .select('id, amount, type, date, description, category, business_unit, payment_method, status, notes')
        .eq('company_id', companyId)
        .order('date', { ascending: false });
      if (error) throw error;
      set({ transactions: (data || []) as Transaction[], isLoading: false });
    } catch (err) {
      console.error("Error fetching treasury:", err);
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
    const { error } = await supabase.from('treasury').update({ status: 'COMPLETED' }).eq('id', id);
    if (error) throw error;
    await get().fetchTransactions();
  },

  transferBetweenAccounts: async (from, to, amount, description) => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) throw new Error('No hay company_id activo');
    const now = new Date().toISOString();
    const { error } = await supabase.from('treasury').insert([
      { amount, type: 'EXPENSE', date: now, description: `TRANSFERENCIA: ${description}`, category: 'TRANSFERENCIA', payment_method: from, status: 'COMPLETED', company_id: companyId },
      { amount, type: 'INCOME', date: now, description: `TRANSFERENCIA: ${description}`, category: 'TRANSFERENCIA', payment_method: to, status: 'COMPLETED', company_id: companyId },
    ]);
    if (error) throw error;
    await get().fetchTransactions();
  },
}));
