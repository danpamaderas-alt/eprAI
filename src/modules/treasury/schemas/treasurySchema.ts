import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../shared/types/database.types';

type Customer = Database['public']['Tables']['customers']['Row'];
type Movement = Database['public']['Tables']['account_movements']['Row'];
type CustomerInsert = Database['public']['Tables']['customers']['Insert'];
type MovementInsert = Database['public']['Tables']['account_movements']['Insert'];

interface CrmState {
  balances: Customer[];
  movements: Movement[];
  isLoading: boolean;
  fetchBalances: (searchTerm?: string) => Promise<void>;
  fetchMovements: (customerId: string) => Promise<void>;
  addCustomer: (customerData: CustomerInsert) => Promise<boolean>;
  addMovement: (movement: MovementInsert) => Promise<boolean>;
  deleteMovement: (movementId: string, customerId: string) => Promise<boolean>;
  editMovement: (movementId: string, customerId: string, amount: number, description: string) => Promise<boolean>;
}

export const useCrmStore = create<CrmState>((set, get) => ({
  balances: [],
  movements: [],
  isLoading: false,

  fetchBalances: async (searchTerm = '') => {
    set({ isLoading: true });
    try {
      let query = supabase.from('customers').select('*');
      if (searchTerm) query = query.ilike('name', `%${searchTerm}%`);
      const { data, error } = await query.order('balance', { ascending: false });
      if (error) throw error;
      set({ balances: data || [] });
    } catch (err) {
      console.error("❌ Error fetchBalances:", err);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMovements: async (customerId) => {
    try {
      const { data, error } = await supabase
        .from('account_movements')
        .select('*')
        .eq('customer_id', customerId)
        .order('date', { ascending: false });
      if (error) throw error;
      set({ movements: data || [] });
    } catch (err) {
      console.error("❌ Error fetchMovements:", err);
    }
  },

  addCustomer: async (customerData) => {
    try {
      const { error } = await supabase.from('customers').insert([customerData]);
      if (error) throw error;
      get().fetchBalances(); 
      return true;
    } catch (err) {
      console.error("❌ [CrmStore] Error al añadir cliente:", err);
      return false;
    }
  },

  addMovement: async () => true,
  deleteMovement: async () => true,
  editMovement: async () => true
}));