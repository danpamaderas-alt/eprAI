import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
<<<<<<< HEAD
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
=======
import { useTenantStore } from '../../../store/useTenantStore';
import Swal from 'sweetalert2';

export interface Product {
  id: string;
  name: string;
  base_stock_qty: number;
  reserved_stock_qty: number; 
  finished_stock_qty: number;
  company_id: string;
>>>>>>> 3845f4f6412c6ab365f55948c5fdc55396a4023c
}

interface InventoryStore {
  products: Product[];
  isLoading: boolean;
  fetchProducts: () => Promise<void>;
<<<<<<< HEAD
  transformToFinished: (variantId: string, quantity: number) => Promise<void>;
=======
  reserveStock: (productId: string, quantity: number) => Promise<boolean>;
  processPersonalization: (productId: string, quantity: number) => Promise<boolean>;
>>>>>>> 3845f4f6412c6ab365f55948c5fdc55396a4023c
}

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  products: [],
  isLoading: false,

  fetchProducts: async () => {
<<<<<<< HEAD
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
=======
    const tenantId = useTenantStore.getState().activeCompanyId;
    if (!tenantId) return;
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('inventory') 
        .select('id, name, base_stock_qty, reserved_stock_qty, finished_stock_qty, company_id')
        .eq('company_id', tenantId)
        .order('name', { ascending: true });
      if (error) throw error;
      set({ products: (data as Product[]) || [] });
    } catch (error) {
      console.error("❌ Error fetchProducts:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  reserveStock: async (productId, quantity) => {
    const product = get().products.find(p => p.id === productId);
    if (!product || product.base_stock_qty < quantity) {
      Swal.fire('Atención', 'No hay stock liso suficiente.', 'warning');
      return false;
    }
    try {
      const { error } = await supabase.from('inventory').update({
        base_stock_qty: product.base_stock_qty - quantity,
        reserved_stock_qty: (product.reserved_stock_qty || 0) + quantity
      }).eq('id', productId);
      if (error) throw error;
      await get().fetchProducts();
      return true;
    } catch { return false; }
  },

  processPersonalization: async (productId, quantity) => {
    const product = get().products.find(p => p.id === productId);
    if (!product || (product.reserved_stock_qty || 0) < quantity) return false;
    try {
      const { error } = await supabase.from('inventory').update({
        reserved_stock_qty: product.reserved_stock_qty - quantity,
        finished_stock_qty: (product.finished_stock_qty || 0) + quantity
      }).eq('id', productId);
      if (error) throw error;
      await get().fetchProducts();
      return true;
    } catch { return false; }
>>>>>>> 3845f4f6412c6ab365f55948c5fdc55396a4023c
  }
}));