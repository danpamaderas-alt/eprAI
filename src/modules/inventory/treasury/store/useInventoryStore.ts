import { create } from 'zustand';
import { supabase } from '../../../../lib/supabase';
import { type Product, type ProductFormValues } from '../schemas/productSchema';

interface InventoryState {
  products: Product[];
  isLoading: boolean;
  fetchProducts: () => Promise<void>;
  addProduct: (data: ProductFormValues) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  updateProductStock: (id: string, newStock: number) => Promise<void>;
}

export const useInventoryStore = create<InventoryState>((set) => ({
  products: [],
  isLoading: false,

  fetchProducts: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('createdAt', { ascending: false });
      if (error) throw error;
      set({ products: data as Product[], isLoading: false });
    } catch (error) {
      set({ isLoading: false });
    }
  },

  addProduct: async (productData) => {
    let totalStock = productData.stock || 0;
    if (productData.variations && productData.variations.length > 0) {
      totalStock = productData.variations.reduce((acc, v) => acc + (Number(v.stock) || 0), 0);
    }
    const { data, error } = await supabase
      .from('products')
      .insert([{ ...productData, stock: totalStock, status: totalStock <= productData.minStock ? 'LOW_STOCK' : 'ACTIVE' }])
      .select().single();
    if (!error) set((state) => ({ products: [data as Product, ...state.products] }));
  },

  deleteProduct: async (id) => {
    await supabase.from('products').delete().eq('id', id);
    set((state) => ({ products: state.products.filter(p => p.id !== id) }));
  },

  updateProductStock: async (id, newStock) => {
    await supabase.from('products').update({ stock: newStock }).eq('id', id);
    set((state) => ({
      products: state.products.map(p => p.id === id ? { ...p, stock: newStock } : p)
    }));
  }
}));