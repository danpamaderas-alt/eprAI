import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// TODO (ARQUITECTURA): Antipatrón detectado (Mezcla de Lógica y UI). 
// El Store (Zustand) maneja la lógica de datos y NO debería importar librerías visuales como SweetAlert2.
// PRÓXIMO PASO: Lanzar un error desde aquí y hacer que los componentes (.tsx) disparen el Swal.fire al capturarlo.
import Swal from 'sweetalert2';

export interface Product {
  id: string;
  sku: string;
  base_quantity: number;
  finished_quantity: number;
  stock_quantity: number;
}

interface InventoryStore {
  products: Product[];
  isLoading: boolean;
  fetchProducts: () => Promise<void>;
  reserveStock: (variantId: string, quantity: number) => Promise<boolean>;
  processPersonalization: (variantId: string, quantity: number) => Promise<boolean>;
}

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  products: [],
  isLoading: false,

  fetchProducts: async () => {
    set({ isLoading: true });
    try {
      // DIAGNÓSTICO: Si esto da 404, es problema de tus POLÍTICAS de Supabase
      const { data, error } = await supabase
        .from('product_variants')
        .select('id, sku, base_quantity, finished_quantity, stock_quantity');

      if (error) {
        console.error("❌ ERROR CRÍTICO SUPABASE:", error);
        throw error;
      }
      
      set({ products: (data as Product[]) || [] });
    } catch (error) {
      console.error("❌ Error en fetchProducts:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  reserveStock: async (variantId, quantity) => {
    const item = get().products.find(p => p.id === variantId);
    if (!item) return false;
    
    if (item.base_quantity < quantity) {
      Swal.fire('Atención', 'No hay stock liso suficiente.', 'warning');
      return false;
    }

    try {
      // TODO (ESCALABILIDAD): Alerta de "Race Condition".
      // Al igual que con las ventas, calcular el nuevo stock en el frontend generará inconsistencias
      // si dos usuarios reservan al mismo tiempo. Migrar a una función RPC en Supabase.
      const { error } = await supabase
        .from('product_variants')
        .update({
          base_quantity: Number(item.base_quantity) - Number(quantity),
          stock_quantity: Number(item.stock_quantity) + Number(quantity)
        })
        .eq('id', variantId);

      if (error) throw error;
      await get().fetchProducts();
      return true;
    } catch (e) {
      console.error("Error al actualizar:", e);
      return false;
    }
  },

  processPersonalization: async (variantId, quantity) => {
    const item = get().products.find(p => p.id === variantId);
    if (!item || (item.stock_quantity || 0) < quantity) return false;
    
    try {
      // TODO (ESCALABILIDAD): Alerta de "Race Condition".
      // Migrar a RPC: ej. supabase.rpc('process_personalization_atomic', { variantId, quantity })
      const { error } = await supabase
        .from('product_variants')
        .update({
          stock_quantity: Number(item.stock_quantity) - Number(quantity),
          finished_quantity: Number(item.finished_quantity) + Number(quantity)
        })
        .eq('id', variantId);
        
      if (error) throw error;
      await get().fetchProducts();
      return true;
    } catch (e) {
      console.error("Error al personalizar:", e);
      return false;
    }
  }
}));