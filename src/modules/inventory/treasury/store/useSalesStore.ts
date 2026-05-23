import { create } from 'zustand';
import { supabase } from '../../../../lib/supabase';

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
  set({ isLoading: true });
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false }); // ✅ AHORA SIEMPRE ES ASÍ

    if (error) throw error;
    set({ products: data as Product[] });
  } catch (error) { 
    console.error("Error:", error); 
  } finally { 
    set({ isLoading: false }); 
  }
},

  addProduct: async (productData) => {
    const { data, error } = await supabase.from('products').insert([productData]).select().single();
    if (error) throw error;
    set((state) => ({ products: [data as Product, ...state.products] }));
  },

  updateProduct: async (id, updates) => {
    const { error } = await supabase.from('products').update(updates).eq('id', id);
    if (error) throw error;
    set((state) => ({ products: state.products.map(p => p.id === id ? { ...p, ...updates } : p) }));
  },

  updateProductStock: async (id, newStock, variationId) => {
    const product = get().products.find(p => p.id === id);
    if (!product) return;
    let updatedVariations = product.variations;
    let totalStock = newStock;

    // TODO (ESCALABILIDAD): Alerta de "Race Condition". Esta suma en el frontend es peligrosa
    // si 2 sucursales descuentan stock al mismo tiempo. Migrar a SQL RPC cuando sea posible.
    if (variationId && product.variations) {
      updatedVariations = product.variations.map(v => v.id === variationId ? { ...v, stock: newStock } : v);
      totalStock = updatedVariations.reduce((acc, v) => acc + v.stock, 0);
    }

    const newStatus = totalStock <= 0 ? 'OUT_OF_STOCK' : totalStock <= product.minStock ? 'LOW_STOCK' : 'ACTIVE';
    const { error } = await supabase.from('products').update({ stock: totalStock, status: newStatus, variations: updatedVariations }).eq('id', id);
    if (error) throw error;
    set((state) => ({ products: state.products.map(p => p.id === id ? { ...p, stock: totalStock, status: newStatus, variations: updatedVariations } : p) }));
  },

  deleteProduct: async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    set((state) => ({ products: state.products.filter(p => p.id !== id) }));
  },

  deleteVariation: async (productId, variationId) => {
    const product = get().products.find(p => p.id === productId);
    if (!product || !product.variations) return;
    const newVars = product.variations.filter(v => v.id !== variationId);
    const newStock = newVars.reduce((acc, v) => acc + v.stock, 0);
    const { error } = await supabase.from('products').update({ variations: newVars, stock: newStock }).eq('id', productId);
    if (error) throw error;
    set((state) => ({ products: state.products.map(p => p.id === productId ? { ...p, variations: newVars, stock: newStock } : p) }));
  }
}));