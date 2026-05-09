import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';

// 🛡️ INTERFAZ ESTRICTA: Reflejamos fielmente la base de datos
export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  type: 'MINORISTA' | 'MAYORISTA' | 'INSTITUCION';
  cuit: string | null; 
  address: string | null;
  balance: number;
  created_at: string;
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
      // 🚀 OPTIMIZACIÓN: Listamos columnas explícitas en lugar de '*' para mejorar el rendimiento de red
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email, phone, company, notes, type, cuit, address, balance, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ customers: (data as Customer[]) || [] });
      
    } catch (error: unknown) { 
      const msg = error instanceof Error ? error.message : 'Error desconocido al cargar clientes';
      console.error("❌ [CRM Store] fetchCustomers falló:", msg); 
    } finally { 
      set({ isLoading: false }); 
    }
  },

  addCustomer: async (data) => {
    try {
      const { data: newCustomer, error } = await supabase
        .from('customers')
        .insert([data])
        .select()
        .single();
        
      if (error) {
        console.error("❌ Supabase rechazó el alta. Detalle:", error.message);
        throw error; 
      }
      
      set((state) => ({ 
        customers: [newCustomer as Customer, ...state.customers] 
      }));
      
    } catch (error: unknown) {
      console.error("❌ [CRM Store] addCustomer falló");
      throw error; 
    }
  },

  updateCustomer: async (id, updates) => {
    try {
      const { error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id);
        
      if (error) throw error;
      
      set((state) => ({
        customers: state.customers.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      }));
      
    } catch (error: unknown) {
      console.error("❌ [CRM Store] updateCustomer falló");
      throw error;
    }
  },

  deleteCustomer: async (id) => {
    try {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      
      if (error) throw error;
      
      set((state) => ({ 
        customers: state.customers.filter((c) => c.id !== id) 
      }));
      
    } catch (error: unknown) {
      console.error("❌ [CRM Store] deleteCustomer falló");
      throw error;
    }
  },
}));