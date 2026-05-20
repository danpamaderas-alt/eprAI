import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
<<<<<<< HEAD

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
=======
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
>>>>>>> 3845f4f6412c6ab365f55948c5fdc55396a4023c
}

export const useCrmStore = create<CrmState>((set, get) => ({
  balances: [],
  isLoading: false,

<<<<<<< HEAD
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
=======
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
>>>>>>> 3845f4f6412c6ab365f55948c5fdc55396a4023c
  }
}));