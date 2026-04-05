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
        // IMPORTANTE: Asegúrate que en SQL se llame "createdAt" con comillas
        .order('createdAt', { ascending: false }); 

      if (error) throw error;
      set({ products: data as Product[], isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      console.error('[Inventory Store] Error al cargar:', error);
    }
  },

  addProduct: async (productData) => {
    // Calculamos el stock sumando las variantes
    const totalStock = productData.variations?.length > 0 
      ? productData.variations.reduce((acc, v) => acc + (Number(v.stock) || 0), 0)
      : (productData.stock || 0);

    const status = determineStatus(totalStock, productData.minStock);

    const { data, error } = await supabase
      .from('products')
      .insert([{ 
        sku: productData.sku,
        name: productData.name,
        category: productData.category,
        price: productData.price,
        minStock: productData.minStock, // Nombre exacto del SQL
        stock: totalStock, 
        status,
        variations: productData.variations 
      }])
      .select()
      .single();

    if (error) throw error;
    set((state) => ({ products: [data as Product, ...state.products] }));
  },

  deleteProduct: async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    set((state) => ({ products: state.products.filter(p => p.id !== id) }));
  },

  updateProductStock: async (id, newStock) => {
    const product = get().products.find(p => p.id === id);
    if (!product) return;

    const newStatus = determineStatus(newStock, product.minStock);

    const { error } = await supabase
      .from('products')
      .update({ stock: newStock, status: newStatus })
      .eq('id', id);

    if (error) throw error;

    set((state) => ({
      products: state.products.map(p => 
        p.id === id ? { ...p, stock: newStock, status: newStatus } : p
      )
    }));
  }
}));