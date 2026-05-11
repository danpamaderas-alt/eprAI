import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import { useTenantStore } from '../../../store/useTenantStore';

// 🛡️ INTERFACES ESTRICTAS
export interface Expense {
  id: string;
  description: string;
  category: string;
  amount: number;
  expense_date: string;
}

export interface FinanceOrder {
  id: string;
  customer_name: string;
  total_amount: number;
  advance_payment: number;
  status: string;
  created_at: string;
}

interface FinanceStore {
  expenses: Expense[];
  orders: FinanceOrder[]; 
  isLoading: boolean;
  fetchFinances: () => Promise<void>;
  addExpense: (expense: Partial<Expense>) => Promise<void>;
}

export const useFinanceStore = create<FinanceStore>((set, get) => ({
  expenses: [],
  orders: [],
  isLoading: false,

  fetchFinances: async () => {
    const tenantId = useTenantStore.getState().activeCompanyId;
    if (!tenantId) return;

    set({ isLoading: true });

    try {
      // 🚀 OPTIMIZACIÓN: Ejecutamos ambas consultas en paralelo y con columnas explícitas
      const [expensesRes, ordersRes] = await Promise.all([
        supabase
          .from('expenses')
          .select('id, description, category, amount, expense_date')
          .eq('company_id', tenantId)
          .order('expense_date', { ascending: false }),
        
        supabase
          .from('orders')
          .select('id, customer_name, total_amount, advance_payment, status, created_at')
          .eq('company_id', tenantId)
          .order('created_at', { ascending: false })
      ]);

      if (expensesRes.error) throw expensesRes.error;
      if (ordersRes.error) throw ordersRes.error;

      set({ 
        expenses: (expensesRes.data as Expense[]) || [], 
        orders: (ordersRes.data as FinanceOrder[]) || [], 
      });

    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error desconocido en finanzas';
      console.error("❌ [FinanceStore] fetchFinances falló:", msg);
    } finally {
      set({ isLoading: false });
    }
  },

  addExpense: async (expense) => {
    const tenantId = useTenantStore.getState().activeCompanyId;
    if (!tenantId) return;

    try {
      const { error } = await supabase
        .from('expenses')
        .insert([{ 
          ...expense, 
          description: expense.description?.toUpperCase().trim(), // Normalización Raíces
          company_id: tenantId 
        }]);
      
      if (error) throw error;

      // Refrescamos los datos para que el dashboard se actualice al instante
      await get().fetchFinances();

    } catch (error: unknown) {
      console.error("❌ [FinanceStore] addExpense falló");
      throw error;
    }
  }
}));