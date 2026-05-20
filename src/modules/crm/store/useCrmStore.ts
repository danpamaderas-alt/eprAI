import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';

export interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  type?: string;
  cuit?: string | null;
  address?: string | null;
  notes?: string | null;
  balance?: number;
  created_at?: string;
}

interface CrmState {
  balances: Customer[];
  isLoading: boolean;
  fetchBalances: () => Promise<void>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<boolean>;
  deleteCustomer: (id: string) => Promise<boolean>;
}

export const useCrmStore = create<CrmState>((set, get) => ({
  balances: [],
  isLoading: false,

  fetchBalances: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('customers') // Asegurate de que tu tabla en Supabase se llame 'customers'
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      set({balances: data || [] });
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  updateCustomer: async (id: string, data: Partial<Customer>) => {
    try {
      const { error } = await supabase
        .from('customers')
        .update(data)
        .eq('id', id);

      if (error) throw error;
      
      // Refrescamos la lista automáticamente después de actualizar
      await get().fetchBalances();
      return true;
    } catch (error) {
      console.error('Error updating customer:', error);
      return false;
    }
  },

  deleteCustomer: async (id: string) => {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Refrescamos la lista automáticamente después de borrar
      await get().fetchBalances();
      return true;
    } catch (error) {
      console.error('Error deleting customer:', error);
      return false;
    }
  }
}));