import { create } from 'zustand';
import { supabase } from '../../../../lib/supabase';
import { useTenantStore } from '../../../../store/useTenantStore';

export interface Variation { id: string; size: string; color: string; stock: number; }

export interface Product {
  id: string; sku: string; name: string; category: string; price: number;
  cost?: number; notes?: string; location?: string; stock: number;
  minStock: number; status: 'ACTIVE' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  variations?: Variation[];
}

interface InventoryStore {
  products: Product[]; isLoading: boolean;
  fetchProducts: () => Promise<void>;
  addProduct: (productData: Omit<Product, 'id'>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  deleteVariation: (productId: string, variationId: string) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  updateProductStock: (id: string, newStock: number, variationId?: string) => Promise<void>;
}

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  products: [], isLoading: false,

fetchProducts: async () => {
  const companyId = useTenantStore.getState().activeCompanyId;
  if (!companyId) return;

  set({ isLoading: true });
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, sku, name, category, price, cost, notes, location, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    set({ products: (data as Product[]) || [] });
  } catch (error) { 
    console.error("Error:", error); 
  } finally { 
    set({ isLoading: false }); 
  }
},

  addProduct: async (productData) => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) throw new Error('No hay company_id activo');
    const { data, error } = await supabase.from('products').insert([{ ...productData, company_id: companyId }]).select().single();
    if (error) throw error;
    set((state) => ({ products: [data as Product, ...state.products] }));
  },

  updateProduct: async (id, updates) => {
    const { error } = await supabase.from('products').update(updates).eq('id', id);
    if (error) throw error;
    set((state) => ({ products: state.products.map(p => p.id === id ? { ...p, ...updates } : p) }));
  },

  updateProductStock: async (id, newStock, variationId) => {
    try {
      const { error } = await supabase.rpc('update_product_stock_atomic', {
        p_product_id: id,
        p_new_stock: newStock,
        p_variation_id: variationId || null
      });

      if (error) throw error;
      await get().fetchProducts();
    } catch (error) {
      console.error("Error al actualizar el stock:", error);
      throw error;
    }
  },

  deleteProduct: async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    set((state) => ({ products: state.products.filter(p => p.id !== id) }));
  },

  deleteVariation: async (productId, variationId) => {
    try {
      const { error } = await supabase.rpc('delete_product_variation', {
        p_product_id: productId,
        p_variation_id: variationId
      });

      if (error) throw error;
      await get().fetchProducts();
    } catch (error) {
      console.error("Error al eliminar variación:", error);
      throw error;
    }
  }
}));