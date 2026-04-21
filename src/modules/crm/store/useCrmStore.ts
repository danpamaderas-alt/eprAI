import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  type?: string;
  // ✅ Agregamos los campos que te pide el formulario
  cuit?: string; 
  address?: string;
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
        .order('created_at', { ascending: false });
      if (error) throw error;
      set({ customers: data as Customer[] });
    } catch (error) { 
      console.error("Error al cargar clientes:", error); 
    } finally { 
      set({ isLoading: false }); 
    }
  },

  addCustomer: async (data) => {
    // 🔍 Filtramos los datos por si acaso viene basura
    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert([data])
      .select()
      .single();
      
    if (error) {
      // 🚨 ESTO ES CLAVE: Nos va a decir EXACTAMENTE qué columna falta
      console.error("❌ Supabase rechazó el cliente. Detalle del error:", error.message);
      throw error; 
    }
    
    set((state) => ({ customers: [newCustomer as Customer, ...state.customers] }));
  },

  updateCustomer: async (id, updates) => {
    const { error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id);
      
    if (error) {
      console.error("❌ Error al actualizar:", error.message);
      throw error;
    }
    
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