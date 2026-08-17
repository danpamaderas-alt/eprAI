import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import { useTenantStore } from '../../../store/useTenantStore';
import Swal from 'sweetalert2';

const MIN_STOCK_DEFAULT = 5;
export const STOCK_THRESHOLDS = { min: MIN_STOCK_DEFAULT };

export interface StockMovement {
  id: string;
  product_id: string;
  variant_id: string;
  product_name: string;
  type: 'sale' | 'adjustment' | 'production' | 'reserve';
  quantity_change: number;
  timestamp: number;
  notes: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size_id: string | null;
  color_id: string | null;
  stock_quantity: number;
  base_quantity: number;
  finished_quantity: number;
  product_name?: string;
  category?: string | null;
  size_name?: string | null;
  color_name?: string | null;
}

interface InventoryStore {
  products: ProductVariant[];
  isLoading: boolean;
  fetchProducts: () => Promise<void>;
  reserveStock: (variantId: string, quantity: number) => Promise<boolean>;
  processPersonalization: (variantId: string, quantity: number) => Promise<boolean>;
  adjustStock: (variantId: string, quantity: number, reason: string) => Promise<boolean>;
  getStockMovements: () => StockMovement[];
  logStockMovement: (movement: Omit<StockMovement, 'id' | 'timestamp'>) => void;
}

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  products: [],
  isLoading: false,

  fetchProducts: async () => {
    const tenantId = useTenantStore.getState().activeCompanyId;
    if (!tenantId) return;
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('product_variants')
        .select('id, product_id, size_id, color_id, stock_quantity, base_quantity, finished_quantity, sizes(name), colors(name), products!inner(id, company_id, name, category)')
        .eq('products.company_id', tenantId)
        .order('id', { ascending: true });
      if (error) throw error;
      const mapped = (data || []).map((v: any) => ({
        ...v,
        product_name: v.products?.name,
        category: v.products?.category || null,
        size_name: v.sizes?.name || null,
        color_name: v.colors?.name || null,
      }));
      set({ products: mapped as ProductVariant[] });
    } catch (error) {
      console.error("Error fetchProducts:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  reserveStock: async (variantId, quantity) => {
    try {
      const { error } = await supabase.rpc('update_product_stock_atomic', {
        p_variant_id: variantId,
        p_field: 'finished_quantity',
        p_delta: -quantity,
      });
      if (error) throw error;
      const product = get().products.find(p => p.id === variantId);
      get().logStockMovement({
        product_id: product?.product_id || '',
        variant_id: variantId,
        product_name: product?.product_name || 'Desconocido',
        type: 'reserve',
        quantity_change: -quantity,
        notes: 'Reservado para taller',
      });
      await get().fetchProducts();
      return true;
    } catch (err: any) {
      Swal.fire('Atención', err?.message || 'No se pudo reservar stock.', 'warning');
      return false;
    }
  },

  processPersonalization: async (variantId, quantity) => {
    try {
      const { error } = await supabase.rpc('transform_to_finished', {
        p_variant_id: variantId,
        p_quantity: quantity,
      });
      if (error) throw error;
      const product = get().products.find(p => p.id === variantId);
      get().logStockMovement({
        product_id: product?.product_id || '',
        variant_id: variantId,
        product_name: product?.product_name || 'Desconocido',
        type: 'production',
        quantity_change: quantity,
        notes: 'Procesado en taller',
      });
      await get().fetchProducts();
      return true;
    } catch (err: any) {
      Swal.fire('Atención', err?.message || 'No se pudo procesar.', 'warning');
      return false;
    }
  },

  adjustStock: async (variantId, quantity, reason) => {
    try {
      const { error } = await supabase.rpc('update_product_stock_atomic', {
        p_variant_id: variantId,
        p_field: 'stock_quantity',
        p_delta: quantity,
      });
      if (error) throw error;
      const product = get().products.find(p => p.id === variantId);
      get().logStockMovement({
        product_id: product?.product_id || '',
        variant_id: variantId,
        product_name: product?.product_name || 'Desconocido',
        type: 'adjustment',
        quantity_change: quantity,
        notes: reason,
      });
      await get().fetchProducts();
      return true;
    } catch (err: any) {
      Swal.fire('Atención', err?.message || 'No se pudo ajustar stock.', 'warning');
      return false;
    }
  },

  logStockMovement: (movement) => {
    const key = 'inventory_stock_movements';
    const existing: StockMovement[] = JSON.parse(localStorage.getItem(key) || '[]');
    const entry: StockMovement = {
      ...movement,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    existing.unshift(entry);
    if (existing.length > 200) existing.length = 200;
    localStorage.setItem(key, JSON.stringify(existing));
  },

  getStockMovements: () => {
    const key = 'inventory_stock_movements';
    return JSON.parse(localStorage.getItem(key) || '[]');
  },
}));
