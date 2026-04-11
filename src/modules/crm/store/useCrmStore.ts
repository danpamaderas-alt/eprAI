import { create } from 'zustand';
import { supabase } from '../../../lib/supabase'; // ✅ 3 niveles justos

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  type?: string; // ✅ Tipo de cliente opcional
  created_at?: string;
}

interface CrmStore {
  customers: Customer[];
  isLoading: boolean;
  fetchCustomers: () => Promise<void>;
  addCustomer: (data: Partial<Customer>) => Promise<void>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
}

export const useCrmStore = create<CrmStore>((set) => ({
  customers: [],
  isLoading: false,

  fetchCustomers: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false }); // ✅ Orden correcto
      if (error) throw error;
      set({ customers: data as Customer[] });
    } catch (error) { 
      console.error(error); 
    } finally { 
      set({ isLoading: false }); 
    }
  },

  addCustomer: async (data) => {
    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert([data])
      .select()
      .single();
    if (error) throw error;
    // Agrega el nuevo cliente arriba de todo
    set((state) => ({ customers: [newCustomer as Customer, ...state.customers] }));
  },

  updateCustomer: async (id, updates) => {
    const { error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
    set((state) => ({
      customers: state.customers.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
  },

  deleteCustomer: async (id) => {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw error;
    set((state) => ({ customers: state.customers.filter((c) => c.id !== id) }));
  },
}));