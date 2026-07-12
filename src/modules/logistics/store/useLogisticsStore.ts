import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import { useTenantStore } from '../../../store/useTenantStore'; 

export interface Delivery {
  id: string;
  customer_name: string;
  address: string;
  zone: string;
  phone?: string;
  items_description: string;
  status: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED';
  notes?: string;
  created_at: string;
}

interface LogisticsStore {
  deliveries: Delivery[];
  isLoading: boolean;
  fetchDeliveries: () => Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addDelivery: (data: any) => Promise<void>;
  updateDeliveryStatus: (id: string, status: Delivery['status']) => Promise<void>;
  deleteDelivery: (id: string) => Promise<void>;
}

export const useLogisticsStore = create<LogisticsStore>((set) => ({
  deliveries: [],
  isLoading: false,

  fetchDeliveries: async () => {
    set({ isLoading: true });
    try {
      const companyId = useTenantStore.getState().activeCompanyId;
      if (!companyId) { set({ isLoading: false }); return; }

      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      set({ deliveries: data as Delivery[] });
    } catch (error) { console.error(error); } finally { set({ isLoading: false }); }
  },

  addDelivery: async (data) => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) throw new Error('No hay company_id activo');

    const { data: newDelivery, error } = await supabase.from('deliveries').insert([{ ...data, company_id: companyId }]).select().single();
    if (error) throw error;
    set((state) => ({ deliveries: [newDelivery as Delivery, ...state.deliveries] }));
  },

  updateDeliveryStatus: async (id, status) => {
    const { error } = await supabase.from('deliveries').update({ status }).eq('id', id);
    if (error) throw error;
    set((state) => ({
      deliveries: state.deliveries.map(d => d.id === id ? { ...d, status } : d)
    }));
  },

  deleteDelivery: async (id) => {
    const { error } = await supabase.from('deliveries').delete().eq('id', id);
    if (error) throw error;
    set((state) => ({ deliveries: state.deliveries.filter(d => d.id !== id) }));
  }
}));