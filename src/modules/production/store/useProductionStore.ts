import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import { useTenantStore } from '../../../store/useTenantStore';

interface ProductionStore {
  activeOrders: any[];
  isLoading: boolean;
  fetchActiveOrders: () => Promise<void>;
}

export const useProductionStore = create<ProductionStore>((set) => ({
  activeOrders: [],
  isLoading: false,
  fetchActiveOrders: async () => {
    set({ isLoading: true });
    const tenantId = useTenantStore.getState().activeCompanyId;
    
    // Solo traemos pedidos que NO estén entregados ni cancelados
    const { data, error } = await supabase
      .from('orders')
      .select('id, status, customer_name, items')
      .eq('company_id', tenantId)
      .neq('status', 'DELIVERED')
      .neq('status', 'CANCELLED');

    if (!error && data) {
      set({ activeOrders: data, isLoading: false });
    } else {
      console.error('Error fetching production orders:', error);
      set({ isLoading: false });
    }
  }
}));

useTenantStore.subscribe((state, prev) => {
  if (state.activeCompanyId !== prev.activeCompanyId) {
    useProductionStore.setState({ activeOrders: [], isLoading: false });
  }
});