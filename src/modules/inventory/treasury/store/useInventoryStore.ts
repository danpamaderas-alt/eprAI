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

// Lógica de dominio centralizada para evitar inconsistencias
const determineStatus = (stock: number, minStock: number): 'ACTIVE' | 'LOW_STOCK' | 'OUT_OF_STOCK' => {
  if (stock <= 0) return 'OUT_OF_STOCK';
  if (stock <= minStock) return 'LOW_STOCK';
  return 'ACTIVE';
};

export const useInventoryStore = create<InventoryState>((set, get) => ({
  products: [],
  isLoading: false,

  fetchProducts: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false }); // Corregido snake_case de auditoría SQL

      if (error) throw error;
      set({ products: data as Product[], isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      console.error('[Inventory Store] Fetch Error:', error);
      throw error;
    }
  },

  addProduct: async (productData) => {
    // Cálculo de stock total blindado
    const totalStock = productData.variations?.length > 0 
      ? productData.variations.reduce((acc, v) => acc + (Number(v.stock) || 0), 0)
      : (productData.stock || 0);

    const status = determineStatus(totalStock, productData.minStock);

    const { data, error } = await supabase
      .from('products')
      .insert([{ 
        ...productData, 
        stock: totalStock, 
        status 
      }])
      .select()
      .single();

    if (error) {
      console.error('[Inventory Store] Insert Error:', error);
      throw error;
    }

    if (data) {
      set((state) => ({ products: [data as Product, ...state.products] }));
    }
  },

  deleteProduct: async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    
    if (error) {
      console.error('[Inventory Store] Delete Error:', error);
      throw error;
    }

    // Solo actualizamos el estado si la DB confirmó el borrado
    set((state) => ({ products: state.products.filter(p => p.id !== id) }));
  },

  updateProductStock: async (id, newStock) => {
    const product = get().products.find(p => p.id === id);
    if (!product) return;

    const newStatus = determineStatus(newStock, product.minStock);

    const { error } = await supabase
      .from('products')
      .update({ stock: newStock, status: newStatus }) // CRÍTICO: Actualización de estado sincronizada
      .eq('id', id);

    if (error) {
      console.error('[Inventory Store] Update Stock Error:', error);
      throw error;
    }

    set((state) => ({
      products: state.products.map(p => 
        p.id === id ? { ...p, stock: newStock, status: newStatus } : p
      )
    }));
  }
}));