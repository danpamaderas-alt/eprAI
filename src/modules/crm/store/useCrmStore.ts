import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';

// PK y Timestamps son ahora responsabilidad estricta del Backend
export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  company: string;
  type: 'MINORISTA' | 'MAYORISTA' | 'GOBIERNO';
  notes: string;
  createdAt: string;
}

interface CrmState {
  customers: Customer[];
  isLoading: boolean;
  fetchCustomers: () => Promise<void>;
  addCustomer: (data: Omit<Customer, 'id' | 'createdAt'>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
}

export const useCrmStore = create<CrmState>((set) => ({
  customers: [],
  isLoading: false,

  fetchCustomers: async () => {
    set({ isLoading: true });
    
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) {
      set({ isLoading: false });
      console.error('[Store Error] Falla al hidratar clientes:', error);
      throw error; // Delegamos el manejo del fallo a la capa de UI
    }

    set({ customers: data || [], isLoading: false });
  },

  addCustomer: async (data) => {
    // Delega ID y CreatedAt a PostgreSQL. Retorna el registro confirmado en disco.
    const { data: insertedCustomer, error } = await supabase
      .from('customers')
      .insert([data])
      .select()
      .single();

    if (error) {
      console.error('[Store Error] Falla en mutación de inserción:', error);
      throw error;
    }

    // Sincronización estricta: Solo actualizamos el estado con la verdad de la BBDD
    if (insertedCustomer) {
      set((state) => ({ customers: [insertedCustomer, ...state.customers] }));
    }
  },

  deleteCustomer: async (id) => {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Store Error] Falla en mutación de borrado:', error);
      throw error;
    }

    // Solo eliminamos del DOM si la BBDD confirmó el borrado (Evita desincronización)
    set((state) => ({ customers: state.customers.filter(c => c.id !== id) }));
  }
}));