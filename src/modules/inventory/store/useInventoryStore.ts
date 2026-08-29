import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import { useTenantStore } from '../../../store/useTenantStore';

type FireArgs =
  | [options?: import('sweetalert2').SweetAlertOptions]
  | [title: string, html?: string, icon?: import('sweetalert2').SweetAlertIcon];

const Swal = {
  fire: async (...args: FireArgs) => {
    const m = (await import('sweetalert2')).default as unknown as { fire: (...a: FireArgs) => Promise<unknown> };
    return m.fire(...args);
  },
};

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

interface NewProductData {
  name: string;
  category?: string;
  price?: number;
  cost_price?: number;
  sku?: string;
}

interface NewVariantData {
  product_id: string;
  size_id?: string | null;
  color_id?: string | null;
  stock_quantity: number;
}

interface InventoryStore {
  products: ProductVariant[];
  sizes: { id: string; name: string }[];
  colors: { id: string; name: string; hex_code?: string }[];
  isLoading: boolean;
  fetchProducts: () => Promise<void>;
  fetchCatalogs: () => Promise<void>;
  reserveStock: (variantId: string, quantity: number) => Promise<boolean>;
  processPersonalization: (variantId: string, quantity: number) => Promise<boolean>;
  adjustStock: (variantId: string, quantity: number, reason: string) => Promise<boolean>;
  createProduct: (data: NewProductData) => Promise<string>;
  createVariant: (data: NewVariantData) => Promise<boolean>;
  createSize: (name: string) => Promise<string>;
  createColor: (name: string, hex?: string) => Promise<string>;
  deleteVariant: (variantId: string) => Promise<boolean>;
  updateProduct: (productId: string, updates: Partial<NewProductData>) => Promise<boolean>;
  getStockMovements: () => StockMovement[];
  logStockMovement: (movement: Omit<StockMovement, 'id' | 'timestamp'>) => void;
}

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  products: [],
  sizes: [],
  colors: [],
  isLoading: false,

  fetchCatalogs: async () => {
    try {
      const [sizesRes, colorsRes] = await Promise.all([
        supabase.from('sizes').select('id, name').order('name'),
        supabase.from('colors').select('id, name, hex_code').order('name'),
      ]);
      set({
        sizes: (sizesRes.data || []) as { id: string; name: string }[],
        colors: (colorsRes.data || []) as { id: string; name: string; hex_code?: string }[],
      });
    } catch (e) {
      console.error('Error fetching catalogs:', e);
    }
  },

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

  createProduct: async (data) => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) throw new Error('No hay compañía activa.');
    const { data: product, error } = await supabase
      .from('products')
      .insert([{
        name: data.name.toUpperCase(),
        category: data.category ?? '',
        price: data.price ?? 0,
        cost_price: data.cost_price ?? null,
        sku: data.sku ?? '',
        company_id: companyId,
      }])
      .select('id')
      .single();
    if (error) throw error;
    return product.id;
  },

  createVariant: async (data) => {
    const { error } = await supabase
      .from('product_variants')
      .insert([{
        product_id: data.product_id,
        size_id: data.size_id || null,
        color_id: data.color_id || null,
        stock_quantity: data.stock_quantity,
        base_quantity: 0,
        finished_quantity: 0,
      }]);
    if (error) throw error;
    await get().fetchProducts();
    return true;
  },

  createSize: async (name) => {
    const { data, error } = await supabase
      .from('sizes')
      .insert([{ name: name.toUpperCase() }])
      .select('id, name')
      .single();
    if (error) throw error;
    set(state => ({ sizes: [...state.sizes, data].sort((a, b) => a.name.localeCompare(b.name)) }));
    return data.id;
  },

  createColor: async (name, hex_code = '#000000') => {
    const { data, error } = await supabase
      .from('colors')
      .insert([{ name: name.toUpperCase(), hex_code }])
      .select('id, name, hex_code')
      .single();
    if (error) throw error;
    set(state => ({ colors: [...state.colors, { ...data, hex_code: data.hex_code ?? undefined }].sort((a, b) => a.name.localeCompare(b.name)) }));
    return data.id;
  },

  deleteVariant: async (variantId) => {
    const { error } = await supabase
      .from('product_variants')
      .delete()
      .eq('id', variantId);
    if (error) throw error;
    await get().fetchProducts();
    return true;
  },

  updateProduct: async (productId, updates) => {
    const { error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', productId);
    if (error) throw error;
    await get().fetchProducts();
    return true;
  },
}));

useTenantStore.subscribe((state, prev) => {
  if (state.activeCompanyId !== prev.activeCompanyId) {
    useInventoryStore.setState({ products: [], sizes: [], colors: [], isLoading: false });
  }
});
