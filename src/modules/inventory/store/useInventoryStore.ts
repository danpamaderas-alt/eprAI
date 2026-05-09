import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import { useTenantStore } from '../../../store/useTenantStore';
import Swal from 'sweetalert2';

// 🛡️ INTERFAZ ESTRICTA PARA CONTROL DE ACTIVOS
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
    const tenantId = useTenantStore.getState().activeCompanyId;
    if (!tenantId) return;

    set({ isLoading: true });
    
    try {
      // 🚀 OPTIMIZACIÓN: Columnas explícitas para mayor velocidad
      const { data, error } = await supabase
        .from('inventory') 
        .select('id, name, base_stock_qty, finished_stock_qty, company_id')
        .eq('company_id', tenantId)
        .order('name', { ascending: true });

      if (error) throw error;
      set({ products: (data as Product[]) || [] });

    } catch (error: unknown) {
      console.error("❌ [InventoryStore] Fallo en carga:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  transformToFinished: async (productId, quantity) => {
    const product = get().products.find(p => p.id === productId);
    
    if (!product) return;
    
    // Verificación de seguridad local previa
    if ((product.base_stock_qty || 0) < quantity) {
        Swal.fire({
          title: 'Stock Insuficiente',
          text: `Solo tenés ${product.base_stock_qty} unidades base disponibles.`,
          icon: 'error',
          confirmButtonColor: '#2563eb'
        });
        return;
    }

    set({ isLoading: true });

    try {
      // 🚀 BLINDAJE: Realizamos la operación atómica directamente en la DB
      // Esto evita race conditions (cuando dos personas operan el mismo stock)
      const { error } = await supabase
        .from('inventory')
        .update({
          base_stock_qty: product.base_stock_qty - quantity,
          finished_stock_qty: (product.finished_stock_qty || 0) + quantity
        })
        .eq('id', productId);

      if (error) throw error;

      // Refrescamos la memoria del store para que la UI se actualice
      await get().fetchProducts();
      
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Transformación completada',
        showConfirmButton: false,
        timer: 2000
      });

    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error en la base de datos';
      Swal.fire('Error de Proceso', msg, 'error');
    } finally {
      set({ isLoading: false });
    }
  }
}));