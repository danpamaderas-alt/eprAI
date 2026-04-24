import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import { useTenantStore } from '../../../store/useTenantStore';
import Swal from 'sweetalert2';

export interface Product {
  id: string;
  name: string;
  base_stock_qty: number;
  finished_stock_qty: number;
  company_id: string;
}

interface InventoryStore {
  products: Product[];
  isLoading: boolean;
  fetchProducts: () => Promise<void>;
  transformToFinished: (productId: string, quantity: number) => Promise<void>;
}

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  products: [],
  isLoading: false,

  fetchProducts: async () => {
    set({ isLoading: true });
    const tenantId = useTenantStore.getState().activeCompanyId;
    
    // ATENCIÓN: Si tu tabla en Supabase tiene otro nombre, cambialo acá (ej: 'products' en vez de 'inventory')
    const { data, error } = await supabase
      .from('inventory') 
      .select('*')
      .eq('company_id', tenantId)
      .order('name', { ascending: true });

    if (error) {
      console.error("Error cargando inventario:", error);
      Swal.fire('Error', error.message, 'error');
    }

    set({ products: data || [], isLoading: false });
  },

  transformToFinished: async (productId: string, quantity: number) => {
    // Busca el producto en la memoria para hacer el cálculo
    const product = get().products.find(p => p.id === productId);
    
    if (!product) return;
    
    if (product.base_stock_qty < quantity) {
        Swal.fire('Error', 'No hay suficiente stock base para procesar esta cantidad.', 'error');
        return;
    }

    const newBase = product.base_stock_qty - quantity;
    const newFinished = (product.finished_stock_qty || 0) + quantity;

    // Actualiza Supabase
    const { error } = await supabase
      .from('inventory')
      .update({
        base_stock_qty: newBase,
        finished_stock_qty: newFinished
      })
      .eq('id', productId);

    if (error) {
      console.error("Error al transformar stock:", error);
      Swal.fire('Error al actualizar', error.message, 'error');
      return;
    }

    // Refresca la tabla en pantalla
    await get().fetchProducts();
  }
}));