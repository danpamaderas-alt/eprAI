import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import { useTenantStore } from '../../../store/useTenantStore';
import Swal from 'sweetalert2';

export interface Product {
  id: string;
  name: string;
  base_stock_qty: number;
  reserved_stock_qty: number; 
  finished_stock_qty: number;
  company_id: string;
}

interface InventoryStore {
  products: Product[];
  isLoading: boolean;
  fetchProducts: () => Promise<void>;
  reserveStock: (productId: string, quantity: number) => Promise<boolean>;
  processPersonalization: (productId: string, quantity: number) => Promise<boolean>;
}

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  products: [],
  isLoading: false,

  fetchProducts: async () => {
    const tenantId = useTenantStore.getState().activeCompanyId;
    if (!tenantId) return;
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('inventory') 
        .select('id, name, base_stock_qty, reserved_stock_qty, finished_stock_qty, company_id')
        .eq('company_id', tenantId)
        .order('name', { ascending: true });
      if (error) throw error;
      set({ products: (data as Product[]) || [] });
    } catch (error) {
      console.error("❌ Error fetchProducts:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  reserveStock: async (productId, quantity) => {
    const product = get().products.find(p => p.id === productId);
    if (!product || product.base_stock_qty < quantity) {
      Swal.fire('Atención', 'No hay stock liso suficiente.', 'warning');
      return false;
    }
    try {
      const { error } = await supabase.from('inventory').update({
        base_stock_qty: product.base_stock_qty - quantity,
        reserved_stock_qty: (product.reserved_stock_qty || 0) + quantity
      }).eq('id', productId);
      if (error) throw error;
      await get().fetchProducts();
      return true;
    } catch { return false; }
  },

  processPersonalization: async (productId, quantity) => {
    const product = get().products.find(p => p.id === productId);
    if (!product || (product.reserved_stock_qty || 0) < quantity) return false;
    try {
      const { error } = await supabase.from('inventory').update({
        reserved_stock_qty: product.reserved_stock_qty - quantity,
        finished_stock_qty: (product.finished_stock_qty || 0) + quantity
      }).eq('id', productId);
      if (error) throw error;
      await get().fetchProducts();
      return true;
    } catch { return false; }
  }
}));