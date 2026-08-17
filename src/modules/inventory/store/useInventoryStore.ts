import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import { useTenantStore } from '../../../store/useTenantStore';
import Swal from 'sweetalert2';

export interface ProductVariant {
  id: string;
  product_id: string;
  size_id: string | null;
  color_id: string | null;
  stock_quantity: number;
  base_quantity: number;
  finished_quantity: number;
  product_name?: string;
}

interface InventoryStore {
  products: ProductVariant[];
  isLoading: boolean;
  fetchProducts: () => Promise<void>;
  reserveStock: (variantId: string, quantity: number) => Promise<boolean>;
  processPersonalization: (variantId: string, quantity: number) => Promise<boolean>;
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
        .from('product_variants')
        .select('id, product_id, size_id, color_id, stock_quantity, base_quantity, finished_quantity, products!inner(id, company_id, name)')
        .eq('products.company_id', tenantId)
        .order('id', { ascending: true });
      if (error) throw error;
      const mapped = (data || []).map((v: any) => ({
        ...v,
        product_name: v.products?.name,
      }));
      set({ products: mapped as ProductVariant[] });
    } catch (error) {
      console.error("Error fetchProducts:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  reserveStock: async (variantId, quantity) => {
    try {
      const { error } = await supabase.rpc('update_product_stock_atomic', {
        p_variant_id: variantId,
        p_field: 'finished_quantity',
        p_delta: -quantity,
      });
      if (error) throw error;
      await get().fetchProducts();
      return true;
    } catch (err: any) {
      Swal.fire('Atención', err?.message || 'No se pudo reservar stock.', 'warning');
      return false;
    }
  },

  processPersonalization: async (variantId, quantity) => {
    try {
      const { error } = await supabase.rpc('transform_to_finished', {
        p_variant_id: variantId,
        p_quantity: quantity,
      });
      if (error) throw error;
      await get().fetchProducts();
      return true;
    } catch (err: any) {
      Swal.fire('Atención', err?.message || 'No se pudo procesar.', 'warning');
      return false;
    }
  },
}));
