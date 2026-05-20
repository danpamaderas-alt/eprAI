import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useTenantStore } from './useTenantStore';

// --- INTERFACES BLINDADAS CONTRA NULL DE SUPABASE ---
export interface CatalogItem { 
  id: string; 
  name: string; 
  hex_code?: string | null; 
  base_price?: number | null; 
}

export interface BusinessUnit { 
  id: string; 
  code: string; 
  name: string; 
}

export interface Product { 
  id: string; 
  company_id?: string | null;
  sku?: string | null;        
  name: string; 
  category?: string | null; 
  cost_price?: number | null; 
  price?: number | null;      
  location?: string | null;   
  notes?: string | null;      
}

export interface Service {
  id: string;
  company_id?: string | null;
  name: string;
  price: number | null;
  description?: string | null;
}

export interface Customer { 
  id: string; 
  company_id?: string | null;
  name: string; 
  company?: string | null; 
  phone?: string | null; 
  balance: number | null; 
}

export interface ProductVariant {
  id: string;
  product_id: string | null;
  size_id: string | null;
  color_id: string | null;
  stock_quantity: number | null;
  base_quantity: number | null;     
  finished_quantity: number | null; 
  products?: Product | null;
  sizes?: { name: string } | null;
  colors?: { name: string } | null;
}

export interface CartItem {
  variantId: string;
  qty: number;
  [key: string]: unknown; 
}

interface CatalogState {
  sizes: CatalogItem[];
  colors: CatalogItem[];
  paymentMethods: CatalogItem[];
  businessUnits: BusinessUnit[];
  products: Product[];
  customers: Customer[];
  personalizationTypes: CatalogItem[];
  inventory: ProductVariant[]; 
  services: Service[];
  isLoading: boolean;
  
  fetchAllCatalogs: () => Promise<void>;
  updateProductComplete: (productId: string, updates: Partial<Product>) => Promise<void>;
  updateStock: (productId: string, sizeId: string, colorId: string, quantity: number) => Promise<void>;
  transformToFinished: (variantId: string, quantityToTransform: number) => Promise<void>; 
  processSale: (_customerId: string, cart: CartItem[], _total: number) => Promise<void>;
  
  addService: (data: Omit<Service, 'id' | 'company_id'>) => Promise<Service>;
  addCustomer: (data: Omit<Customer, 'id' | 'balance' | 'company_id'>) => Promise<Customer>;
  addProduct: (data: Omit<Product, 'id' | 'company_id'>) => Promise<Product>;
  addSize: (name: string) => Promise<CatalogItem>;
  addColor: (name: string, hex?: string) => Promise<CatalogItem>;
  addPersonalizationType: (name: string, price: number) => Promise<CatalogItem>;
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  sizes: [], 
  colors: [], 
  paymentMethods: [], 
  businessUnits: [], 
  products: [], 
  customers: [], 
  personalizationTypes: [], 
  inventory: [], 
  services: [],
  isLoading: false,

  fetchAllCatalogs: async () => {
    set({ isLoading: true });
    const companyId = useTenantStore.getState().activeCompanyId;

    // ⚡ FUNCIÓN SALVAVIDAS: Si una tabla falla, devuelve un arreglo vacío pero no rompe el sistema
    const fetchSafe = async (query: any) => {
      try {
        const res = await query;
        if (res.error) {
          console.warn('Advertencia (Tabla no encontrada o sin permisos):', res.error.message);
          return { data: [] };
        }
        return res;
      } catch (e) {
        return { data: [] };
      }
    };

    try {
      // ⚡ PLAN B PARA EL INVENTARIO: Si fallan las relaciones de talles/colores, lo traemos de forma simple
      let inventoryQuery = await supabase.from('product_variants').select('*, sizes(name), colors(name)');
      if (inventoryQuery.error) {
        console.warn('Falló el cruce complejo de variantes, activando modo seguro...');
        inventoryQuery = await supabase.from('product_variants').select('*');
      }

      // ⚡ AQUÍ ESTÁ LA CORRECCIÓN: Cambiamos la consulta de products a select('*')
      const [ resSizes, resColors, resPayments, resUnits, resProducts, resCustomers, resPerso, resServices ] = await Promise.all([
        fetchSafe(supabase.from('sizes').select('*').order('name')),
        fetchSafe(supabase.from('colors').select('*').order('name')),
        fetchSafe(supabase.from('payment_methods').select('*').order('name')),
        fetchSafe(supabase.from('business_units').select('*').order('name')),
        fetchSafe(supabase.from('products').select('*').eq('company_id', companyId).order('name')),
        fetchSafe(supabase.from('customers').select('*').eq('company_id', companyId).order('name')),
        fetchSafe(supabase.from('personalization_types').select('*').order('name')),
        fetchSafe(supabase.from('services').select('*').eq('company_id', companyId).order('name')),
      ]);

      set({ 
        sizes: (resSizes.data as CatalogItem[]) || [], 
        colors: (resColors.data as CatalogItem[]) || [], 
        paymentMethods: (resPayments.data as CatalogItem[]) || [],
        businessUnits: (resUnits.data as BusinessUnit[]) || [], 
        products: (resProducts.data as Product[]) || [], 
        customers: (resCustomers.data as Customer[]) || [],
        personalizationTypes: (resPerso.data as CatalogItem[]) || [], 
        inventory: (inventoryQuery.data as ProductVariant[]) || [], 
        services: (resServices.data as Service[]) || [], 
        isLoading: false 
      });
    } catch (error) { 
      console.error('Error general en fetchAllCatalogs:', error); 
      set({ isLoading: false }); 
    }
  },

  updateProductComplete: async (productId, updates) => {
    try {
      const { error } = await supabase.from('products').update(updates).eq('id', productId);
      if (error) throw error;
      await get().fetchAllCatalogs();
    } catch (error) { 
      console.error('Error al actualizar producto:', error); 
      throw error; 
    }
  },

 updateStock: async (productId, sizeId, colorId, quantity) => {
    try {
      const { data: existing, error: searchError } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productId)
        .eq('size_id', sizeId)
        .eq('color_id', colorId)
        .single();

      if (searchError && searchError.code !== 'PGRST116') {
        throw searchError; 
      }
      
      if (existing) {
        const newTotal = (existing.stock_quantity || 0) + quantity;
        const newBase = (existing.base_quantity || 0) + quantity;
        
        const { error: updateError } = await supabase.from('product_variants').update({ 
          stock_quantity: newTotal,
          base_quantity: newBase 
        }).eq('id', existing.id);

        if (updateError) throw updateError; 

      } else {
        const { error: insertError } = await supabase.from('product_variants').insert([{ 
          product_id: productId, 
          size_id: sizeId, 
          color_id: colorId, 
          stock_quantity: quantity,
          base_quantity: quantity 
        }]);

        if (insertError) throw insertError; 
      }
      await get().fetchAllCatalogs();
    } catch (error) { 
      console.error('🔥 Error Real en updateStock:', error); 
      throw error; 
    }
  },

  transformToFinished: async (variantId, quantityToTransform) => {
    try {
      const { data: item, error: fetchError } = await supabase.from('product_variants').select('*').eq('id', variantId).single();
      if (fetchError) throw fetchError;

      const baseActual = item.base_quantity || 0;
      const termActual = item.finished_quantity || 0;

      if (baseActual >= quantityToTransform) {
        const newBase = baseActual - quantityToTransform;
        const newFinished = termActual + quantityToTransform;

        const { error: updateError } = await supabase.from('product_variants').update({
            base_quantity: newBase,
            finished_quantity: newFinished
          }).eq('id', variantId);

        if (updateError) throw updateError;
        await get().fetchAllCatalogs();
      } else {
        throw new Error('No hay suficientes prendas lisas para esta operación.');
      }
    } catch (error) {
      console.error('Error al acondicionar:', error);
      throw error;
    }
  },

  processSale: async (_customerId, cart, _total) => {
    try {
      for (const item of cart) {
        const { data: variant } = await supabase.from('product_variants').select('finished_quantity').eq('id', item.variantId).single();
        if (variant) {
          await supabase.from('product_variants').update({ 
            finished_quantity: (variant.finished_quantity || 0) - item.qty 
          }).eq('id', item.variantId);
        }
      }
      await get().fetchAllCatalogs();
    } catch (error) {
      console.error('Error descontando stock en la venta:', error);
      throw error;
    }
  },

  addService: async (serviceData) => {
    const companyId = useTenantStore.getState().activeCompanyId;
    const { data, error } = await supabase.from('services').insert([{ ...serviceData, company_id: companyId }]).select().single();
    if (error) throw error;
    set((state) => ({ services: [...state.services, data as Service].sort((a, b) => a.name.localeCompare(b.name)) }));
    return data as Service;
  },

  addCustomer: async (customerData) => {
    const companyId = useTenantStore.getState().activeCompanyId;
    const { data, error } = await supabase.from('customers').insert([{ ...customerData, company_id: companyId }]).select().single();
    if (error) throw error;
    set((state) => ({ customers: [...state.customers, data as Customer].sort((a, b) => a.name.localeCompare(b.name)) }));
    return data as Customer;
  },

  addProduct: async (productData) => {
    const companyId = useTenantStore.getState().activeCompanyId;
    const { data, error } = await supabase.from('products').insert([{ ...productData, company_id: companyId }]).select().single();
    if (error) throw error;
    set((state) => ({ products: [...state.products, data as Product].sort((a, b) => a.name.localeCompare(b.name)) }));
    return data as Product;
  },

  addSize: async (name) => {
    const { data, error } = await supabase.from('sizes').insert([{ name }]).select().single();
    if (error) throw error;
    set((state) => ({ sizes: [...state.sizes, data as CatalogItem].sort((a, b) => a.name.localeCompare(b.name)) }));
    return data as CatalogItem;
  },

  addColor: async (name, hex_code = '#000000') => {
    const { data, error } = await supabase.from('colors').insert([{ name, hex_code }]).select().single();
    if (error) throw error;
    set((state) => ({ colors: [...state.colors, data as CatalogItem].sort((a, b) => a.name.localeCompare(b.name)) }));
    return data as CatalogItem;
  },

  addPersonalizationType: async (name, base_price) => {
    const { data, error } = await supabase.from('personalization_types').insert([{ name, base_price }]).select().single();
    if (error) throw error;
    set((state) => ({ personalizationTypes: [...state.personalizationTypes, data as CatalogItem].sort((a, b) => a.name.localeCompare(b.name)) }));
    return data as CatalogItem;
  }
}));