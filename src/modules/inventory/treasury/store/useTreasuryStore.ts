import { create } from 'zustand';
import { supabase } from '../../../../lib/supabase';
import { useTenantStore } from '../../../../store/useTenantStore';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  type: 'INCOME' | 'EXPENSE';
  businessUnit: 'GENERAL' | 'ROJO_SHOWROOM' | 'RAICES' | 'UNIFORMES' | 'RJ_CO' | 'BITA_IT';
  paymentMethod: 'MERCADO_PAGO' | 'BANCO' | 'EFECTIVO';
  amount: number;
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
  company_id?: string;
}

interface TreasuryState {
  transactions: Transaction[];
  isLoading: boolean;
  fetchTransactions: () => Promise<void>;
  addTransaction: (tx: Omit<Transaction, 'id' | 'company_id'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
}

export const useTreasuryStore = create<TreasuryState>((set) => ({
  transactions: [],
  isLoading: false,
  
  fetchTransactions: async () => {
    set({ isLoading: true });
    const companyId = useTenantStore.getState().activeCompanyId;
    const { data, error } = await supabase
      .from('treasury')
      .select('*')
      .eq('company_id', companyId)
      .order('date', { ascending: false });
      
    if (!error) {
      set({ transactions: data as Transaction[], isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  addTransaction: async (tx) => {
    const companyId = useTenantStore.getState().activeCompanyId;
    const { error } = await supabase.from('treasury').insert([
      { ...tx, company_id: companyId, status: 'COMPLETED' }
    ]);
    if (error) throw error;
  },

  deleteTransaction: async (id) => {
    const { error } = await supabase.from('treasury').delete().eq('id', id);
    if (error) throw error;
    // Volvemos a cargar para actualizar la lista y los saldos
    useTreasuryStore.getState().fetchTransactions();
  }
}));