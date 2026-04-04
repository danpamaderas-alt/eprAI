import { create } from 'zustand';
import { supabase } from '../../../../lib/supabase';
import { type Product, type ProductFormValues } from '../schemas/productSchema';
import Swal from 'sweetalert2';

// Función auxiliar para centralizar la lógica de negocio del inventario
const calculateStatus = (stock: number, minStock: number): Product['status'] => {
  if (stock <= 0) return 'OUT_OF_STOCK';
  if (stock <= minStock) return 'LOW_STOCK';
  return 'ACTIVE';
};

interface InventoryState {
  products: Product[];
  isLoading: boolean;
  fetchProducts: () => Promise<void>;
  addProduct: (data: ProductFormValues) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  updateStock: (id: string, newStock: number) => Promise<void>;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  products: [],
  isLoading: false,

  // 1. DESCARGA: Con ordenamiento inteligente
  fetchProducts: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true }); // Ordenamos alfabéticamente por defecto

      if (error) throw error;
      set({ products: data || [], isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      console.error('🚨 Error descargando catálogo:', error.message);
    }
  },

  // 2. ALTA: Sincronización garantizada con la nube
  addProduct: async (data) => {
    set({ isLoading: true });
    try {
      const stock = Number(data.stock) || 0;
      const minStock = Number(data.minStock) || 0;
      
      const { data: newProduct, error } = await supabase
        .from('products')
        .insert([{
          ...data,
          stock,
          minStock,
          status: calculateStatus(stock, minStock),
          lastUpdated: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      set((state) => ({ 
        products: [newProduct, ...state.products],
        isLoading: false 
      }));

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Producto añadido al catálogo',
        showConfirmButton: false,
        timer: 2000
      });
    } catch (error: any) {
      set({ isLoading: false });
      Swal.fire('Error al crear producto', error.message, 'error');
    }
  },

  // 3. ELIMINACIÓN: Con confirmación de integridad
  deleteProduct: async (id) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => ({ 
        products: state.products.filter(p => p.id !== id) 
      }));
    } catch (error: any) {
      Swal.fire('Error', 'No se pudo eliminar el producto. Quizás tiene ventas asociadas.', 'error');
    }
  },

  // 4. STOCK: Actualización optimista con protección de datos
  updateStock: async (id, newStock) => {
    const originalProducts = get().products;
    const product = originalProducts.find(p => p.id === id);
    if (!product) return;

    const stock = Number(newStock);
    const status = calculateStatus(stock, product.minStock);
    const lastUpdated = new Date().toISOString();

    // Actualización Optimista: Cambiamos la pantalla ANTES de ir a la nube
    set((state) => ({
      products: state.products.map(p => 
        p.id === id ? { ...p, stock, status, lastUpdated } : p
      )
    }));

    try {
      const { error } = await supabase
        .from('products')
        .update({ stock, status, lastUpdated })
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      // Rollback: Si la nube falla, devolvemos el stock a como estaba
      set({ products: originalProducts });
      Swal.fire({
        title: 'Error de sincronización',
        text: 'El stock no se pudo actualizar en la base de datos.',
        icon: 'warning'
      });
    }
  }
}));