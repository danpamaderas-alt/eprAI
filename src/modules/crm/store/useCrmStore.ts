import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../shared/types/database.types';

type CustomerInsert = Database['public']['Tables']['customers']['Insert'];
type MovementInsert = Database['public']['Tables']['account_movements']['Insert'];

interface CrmState {
  balances: any[];
  isLoading: boolean;
  fetchBalances: (searchTerm?: string) => Promise<void>;
  fetchMovements: (customerId: string) => Promise<void>;
  addCustomer: (customerData: CustomerInsert) => Promise<boolean>;
  addMovement: (movement: MovementInsert) => Promise<boolean>;
}

export const useCrmStore = create<CrmState>((set, get) => ({
  balances: [],
  isLoading: false,

  fetchBalances: async (searchTerm = '') => {
    set({ isLoading: true });
    try {
      let query = supabase.from('customers').select('*');
      if (searchTerm) query = query.ilike('name', `%${searchTerm}%`);
      const { data, error } = await query.order('balance', { ascending: false });
      if (error) throw error;
      set({ balances: data || [] });
    } finally { set({ isLoading: false }); }
  },

  fetchMovements: async () => { /* Implementado en componente */ },

  addCustomer: async (customerData) => {
    try {
      const { error } = await supabase.from('customers').insert([customerData]);
      if (error) throw error;
      get().fetchBalances(); 
      return true;
    } catch { return false; }
  },

  addMovement: async (movement) => {
    try {
      const { error } = await supabase.from('account_movements').insert([movement]);
      if (error) throw error;
      get().fetchBalances();
      return true;
    } catch { return false; }
  }
}));