import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import Swal from 'sweetalert2';

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

    if (!error && data) {
      set({ customers: data, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  addCustomer: async (data) => {
    const newCustomer: Customer = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date().toISOString(),
    };

    const { error } = await supabase.from('customers').insert([newCustomer]);
    if (!error) {
      set((state) => ({ customers: [newCustomer, ...state.customers] }));
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Cliente guardado', showConfirmButton: false, timer: 1500 });
    } else {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar el cliente en la nube.' });
    }
  },

  deleteCustomer: async (id) => {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (!error) {
      set((state) => ({ customers: state.customers.filter(c => c.id !== id) }));
    }
  }
}));