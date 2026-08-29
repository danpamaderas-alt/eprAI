import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useTenantStore } from './useTenantStore';
import type { PostgrestError } from '@supabase/supabase-js';
import type { Database } from '../shared/types/database.types';

type ProductUpdate = Database['public']['Tables']['products']['Update'];

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
  type: string;
  loyalty_points?: number | null;
  portal_access?: boolean | null;
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
  processSale: (customerId: string | null, cart: CartItem[], total: number) => Promise<void>;
  
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
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) return;

    set({ isLoading: true });

    const fetchSafe = async <T,>(query: PromiseLike<{ data: T[] | null; error: PostgrestError | null }>): Promise<{ data: T[] }> => {
      try {
        const res = await query;
        if (res.error) {
          console.error('Fetch error:', res.error.message);
          return { data: [] };
        }
        return { data: res.data || [] };
      } catch (e) {
        console.error('Unexpected fetch error:', e);
        return { data: [] };
      }
    };

    try {
      const [
        resSizes,
        resColors,
        resPayments,
        resUnits,
        resProducts,
        resCustomers,
        resPerso,
        resServices,
        inventoryQuery
      ] = await Promise.all([
        fetchSafe<CatalogItem>(supabase.from('sizes').select('id, name').order('name')),
        fetchSafe<CatalogItem>(supabase.from('colors').select('id, name, hex_code').order('name')),
        fetchSafe<CatalogItem>(supabase.from('payment_methods').select('id, name').order('name')),
        fetchSafe<BusinessUnit>(supabase.from('business_units').select('id, code, name').order('name')),
        fetchSafe<Product>(supabase.from('products').select('id, company_id, sku, name, category, cost_price, price').eq('company_id', companyId).order('name')),
        fetchSafe<Customer>(supabase.from('customers').select('id, company_id, name, company, phone, balance, type, loyalty_points, portal_access').eq('company_id', companyId).order('name')),
        fetchSafe<CatalogItem>(
          supabase.from('personalization_types').select('id, name, base_price').eq('company_id', companyId).order('name')
        ),
        fetchSafe<Service>(supabase.from('services').select('id, company_id, name, price, description').eq('company_id', companyId).order('name')),
        
        fetchSafe<ProductVariant>(
          supabase.from('product_variants')
            .select('id, product_id, size_id, color_id, stock_quantity, base_quantity, finished_quantity, sizes(name), colors(name), products!inner(id, company_id, name, category, price, cost_price)')
            .eq('products.company_id', companyId)
        )
      ]);

      set({ 
        sizes: resSizes.data, 
        colors: resColors.data, 
        paymentMethods: resPayments.data,
        businessUnits: resUnits.data, 
        products: resProducts.data, 
        customers: resCustomers.data,
        personalizationTypes: resPerso.data, 
        inventory: inventoryQuery.data, 
        services: resServices.data, 
        isLoading: false 
      });
    } catch (error) { 
      console.error('Error fetching catalogs:', error); 
      set({ isLoading: false }); 
    }
  },

  updateProductComplete: async (productId, updates) => {
    const { error } = await supabase.from('products').update(updates as ProductUpdate).eq('id', productId);
    if (error) throw error;
    await get().fetchAllCatalogs();
  },

  updateStock: async (productId, sizeId, colorId, quantity) => {
    const { error } = await supabase.rpc('upsert_stock', {
      p_product_id: productId,
      p_size_id: sizeId,
      p_color_id: colorId,
      p_quantity: Number(quantity)
    });
    if (error) throw error; 
    await get().fetchAllCatalogs();
  },

  transformToFinished: async (variantId, quantityToTransform) => {
    const { error } = await supabase.rpc('transform_to_finished', {
      p_variant_id: variantId,
      p_quantity: Number(quantityToTransform)
    });
    if (error) {
       if (error.message.includes('No hay suficientes prendas lisas')) {
           throw new Error('No hay suficientes prendas lisas para esta operación.');
       }
       throw error;
    }
    await get().fetchAllCatalogs();
  },

  processSale: async (customerId, cart, total) => {
    const cartItems = cart.map(item => ({
      variantId: item.variantId,
      qty: item.qty
    }));

    const { error } = await supabase.rpc('process_sale_atomic', {
      customer_id_param: customerId as string,
      cart_items: cartItems,
      total_amount_param: total,
    });
    if (error) throw error;
    await get().fetchAllCatalogs();
  },

  addService: async (serviceData) => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) throw new Error('No hay compañía activa.');
    const { data, error } = await supabase.from('services').insert([{ ...serviceData, company_id: companyId }]).select().single();
    if (error) throw error;
    set((state) => ({ services: [...state.services, data as Service].sort((a, b) => a.name.localeCompare(b.name)) }));
    return data as Service;
  },

  addCustomer: async (customerData) => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) throw new Error('No hay compañía activa.');
    const { data, error } = await supabase.from('customers').insert([{ ...customerData, type: customerData.type || 'minorista', company_id: companyId }]).select().single();
    if (error) throw error;
    set((state) => ({ customers: [...state.customers, data as Customer].sort((a, b) => a.name.localeCompare(b.name)) }));
    return data as Customer;
  },

  addProduct: async (productData) => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) throw new Error('No hay compañía activa.');
    const insertData = {
      ...productData,
      category: productData.category ?? 'general',
      // Supabase schema requires price as number, not null
      ...(productData.price != null ? { price: productData.price } : {}),
      company_id: companyId
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase.from('products').insert([insertData as any]).select().single();
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

  addPersonalizationType: async (name, price) => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) throw new Error('No hay compañía activa.');
    const { data, error } = await supabase
      .from('personalization_types')
      .insert([{ name, base_price: price, company_id: companyId }])
      .select('id, name, base_price')
      .single();
    if (error) throw error;
    
    const mappedData: CatalogItem = {
      id: data.id,
      name: data.name,
      base_price: data.base_price
    };
    
    set((state: CatalogState) => ({ personalizationTypes: [...state.personalizationTypes, mappedData].sort((a, b) => a.name.localeCompare(b.name)) }));
    return mappedData;
  }
}));

useTenantStore.subscribe((state, prev) => {
  if (state.activeCompanyId !== prev.activeCompanyId) {
    useCatalogStore.setState({
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
    });
  }
});