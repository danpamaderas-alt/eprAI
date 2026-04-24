import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import { useTenantStore } from '../../../store/useTenantStore';

export interface Expense {
  id: string;
  description: string;
  category: string;
  amount: number;
  expense_date: string;
}

interface FinanceStore {
  expenses: Expense[];
  orders: any[]; // Usamos los pedidos como fuente de ingresos
  isLoading: boolean;
  fetchFinances: () => Promise<void>;
  addExpense: (expense: Partial<Expense>) => Promise<void>;
}

export const useFinanceStore = create<FinanceStore>((set, get) => ({
  expenses: [],
  orders: [],
  isLoading: false,

  fetchFinances: async () => {
    set({ isLoading: true });
    const tenantId = useTenantStore.getState().activeCompanyId;
    
    // 1. Traemos los gastos
    const { data: expensesData } = await supabase
      .from('expenses')
      .select('*')
      .eq('company_id', tenantId)
      .order('expense_date', { ascending: false });

    // 2. Traemos los pedidos (para leer las señas y totales)
    const { data: ordersData } = await supabase
      .from('orders')
      .select('id, customer_name, total_amount, advance_payment, status, created_at')
      .eq('company_id', tenantId)
      .order('created_at', { ascending: false });

    set({ 
      expenses: expensesData || [], 
      orders: ordersData || [], 
      isLoading: false 
    });
  },

  addExpense: async (expense) => {
    const tenantId = useTenantStore.getState().activeCompanyId;
    const { error } = await supabase
      .from('expenses')
      .insert([{ ...expense, company_id: tenantId }]);
    
    if (!error) await get().fetchFinances();
  }
}));