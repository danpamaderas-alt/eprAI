import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import Swal from 'sweetalert2';

// 🛡️ DEFINICIÓN DE ESTRUCTURA PROFESIONAL
export interface Variant {
  id: string;
  product_id: string;
  size: string;
  color: string;
  stock_base: number;
  stock_finished: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  sale_price: number;
  product_variants: Variant[]; // Relación con sus talles/colores
}

interface InventoryStore {
  products: Product[];
  isLoading: boolean;
  fetchProducts: () => Promise<void>;
  transformToFinished: (variantId: string, quantity: number) => Promise<void>;
}

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  products: [],
  isLoading: false,

  fetchProducts: async () => {
    set({ isLoading: true });
    
    // 🚀 SELECT DINÁMICO: Trae el producto y todas sus variantes de un saque
    const { data, error } = await supabase
      .from('products')
      .select('*, product_variants(*)') 
      .order('name', { ascending: true });

    if (error) {
      console.error("Error cargando productos:", error);
      Swal.fire('Error', 'No se pudo conectar con el catálogo nuevo', 'error');
    }

    set({ products: data || [], isLoading: false });
  },

  transformToFinished: async (variantId, quantity) => {
    set({ isLoading: true });

    try {
      // 1. Buscamos la variante específica en la base de datos
      const { data: variant, error: fetchError } = await supabase
        .from('product_variants')
        .select('stock_base, stock_finished')
        .eq('id', variantId)
        .single();

      if (fetchError || !variant) throw new Error("Variante no encontrada");

      if (variant.stock_base < quantity) {
        Swal.fire('Atención', 'No hay suficiente stock liso para esta operación', 'warning');
        return;
      }

      // 2. Operación Atómica: Actualizamos directamente en SQL
      const { error: updateError } = await supabase
        .from('product_variants')
        .update({
          stock_base: variant.stock_base - quantity,
          stock_finished: variant.stock_finished + quantity
        })
        .eq('id', variantId);

      if (updateError) throw updateError;

      // 3. Refrescar datos
      await get().fetchProducts();
      
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Prendas acondicionadas correctamente',
        showConfirmButton: false,
        timer: 2000
      });

    } catch (err: any) {
      Swal.fire('Error en Taller', err.message, 'error');
    } finally {
      set({ isLoading: false });
    }
  }
}));