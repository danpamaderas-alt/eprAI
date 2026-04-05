import { create } from 'zustand';
import { supabase } from '../../../../lib/supabase';
import { type Product, type ProductFormValues } from '../schemas/productSchema';
import Swal from 'sweetalert2';

interface InventoryState {
  products: Product[];
  isLoading: boolean;
  fetchProducts: () => Promise<void>;
  addProduct: (data: ProductFormValues) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  // 👇 Nueva función agregada al contrato
  updateProductStock: (id: string, newStock: number) => Promise<void>;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
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
      console.error('Error cargando inventario:', error);
      set({ isLoading: false });
    }
  },

  addProduct: async (productData) => {
    let totalStock = productData.stock || 0;
    if (productData.variations && productData.variations.length > 0) {
      totalStock = productData.variations.reduce((acumulador, variante) => acumulador + (Number(variante.stock) || 0), 0);
    }

    let currentStatus: 'ACTIVE' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'ACTIVE';
    if (totalStock === 0) {
      currentStatus = 'OUT_OF_STOCK';
    } else if (totalStock <= productData.minStock) {
      currentStatus = 'LOW_STOCK';
    }

    const newProduct = {
      ...productData,
      stock: totalStock,
      status: currentStatus
    };
    
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([newProduct])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { 
            Swal.fire('Error de Código', 'Ya existe un producto registrado con ese mismo SKU.', 'error');
            return;
        }
        throw error;
      }

      set((state) => ({ products: [data as Product, ...state.products] }));
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Producto ingresado', showConfirmButton: false, timer: 1500 });
    } catch (error) {
      console.error('Error guardando producto:', error);
      Swal.fire('Error', 'Hubo un problema de conexión.', 'error');
    }
  },

  deleteProduct: async (id) => {
    try {
       const { error } = await supabase.from('products').delete().eq('id', id);
       if (error) throw error;
       set((state) => ({ products: state.products.filter(p => p.id !== id) }));
       Swal.fire('Eliminado', 'Producto borrado del catálogo', 'success');
    } catch (error) {
       console.error('Error borrando producto:', error);
       Swal.fire('Error', 'No se pudo eliminar el producto', 'error');
    }
  },

  // 👇 NUEVA FUNCIÓN: ACTUALIZAR STOCK
  updateProductStock: async (id, newStock) => {
    const product = get().products.find(p => p.id === id);
    if (!product) return;

    // Recalculamos el estado (para que si llega a 0, se ponga en OUT_OF_STOCK solo)
    let currentStatus: 'ACTIVE' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'ACTIVE';
    if (newStock === 0) {
      currentStatus = 'OUT_OF_STOCK';
    } else if (newStock <= product.minStock) {
      currentStatus = 'LOW_STOCK';
    }

    try {
      // 1. Mandamos el nuevo número a la base de datos
      const { error } = await supabase
        .from('products')
        .update({ stock: newStock, status: currentStatus })
        .eq('id', id);

      if (error) throw error;

      // 2. Actualizamos la pantalla al instante
      set((state) => ({
        products: state.products.map(p =>
          p.id === id ? { ...p, stock: newStock, status: currentStatus } : p
        )
      }));
      
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Stock actualizado', showConfirmButton: false, timer: 1500 });
    } catch (error) {
      console.error('Error actualizando stock:', error);
      Swal.fire('Error', 'No se pudo actualizar el stock en la nube', 'error');
    }
  }
}));