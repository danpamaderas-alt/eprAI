import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useTenantStore } from './useTenantStore';

// --- INTERFACES ---
export interface CatalogItem { id: string; name: string; hex_code?: string; base_price?: number; }
export interface BusinessUnit { id: string; code: string; name: string; }

export interface Product { 
  id: string; 
  company_id?: string;
  sku?: string;        
  name: string; 
  category?: string; 
  cost_price?: number; 
  price?: number;      
  location?: string;   
  notes?: string;      
}

export interface Service {
  id: string;
  company_id?: string;
  name: string;
  price: number;
  description?: string;
}

export interface Customer { 
  id: string; 
  company_id?: string;
  name: string; 
  company?: string; 
  phone?: string; 
  balance: number; 
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size_id: string;
  color_id: string;
  stock_quantity: number;
  base_quantity: number;     
  finished_quantity: number; 
  products?: Product;
  sizes?: { name: string };
  colors?: { name: string };
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
  
  // ✅ AGREGAMOS PROCESS SALE A LA INTERFAZ
  processSale: (customerId: string, cart: any[], total: number) => Promise<void>;
  
  addService: (data: Omit<Service, 'id' | 'company_id'>) => Promise<Service>;
  addCustomer: (data: Omit<Customer, 'id' | 'balance' | 'company_id'>) => Promise<Customer>;
  addProduct: (data: Omit<Product, 'id' | 'company_id'>) => Promise<Product>;
  addSize: (name: string) => Promise<CatalogItem>;
  addColor: (name: string, hex?: string) => Promise<CatalogItem>;
  addPersonalizationType: (name: string, price: number) => Promise<CatalogItem>;
  registerPayment: (customerId: string, amount: number, notes: string) => Promise<void>;
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

    try {
      const [ resSizes, resColors, resPayments, resUnits, resProducts, resCustomers, resPerso, resInventory, resServices ] = await Promise.all([
        supabase.from('sizes').select('*').order('name'),
        supabase.from('colors').select('*').order('name'),
        supabase.from('payment_methods').select('*').order('name'),
        supabase.from('business_units').select('*').order('name'),
        supabase.from('products').select('id, sku, name, category, cost_price, price, location, notes, company_id').eq('company_id', companyId).order('name'),
        supabase.from('customers').select('*').eq('company_id', companyId).order('name'),
        supabase.from('personalization_types').select('*').order('name'),
        supabase.from('product_variants').select(`*, sizes(name), colors(name)`),
        supabase.from('services').select('*').eq('company_id', companyId).order('name'),
      ]);

      set({ 
        sizes: resSizes.data || [], 
        colors: resColors.data || [], 
        paymentMethods: resPayments.data || [],
        businessUnits: resUnits.data || [], 
        products: resProducts.data || [], 
        customers: resCustomers.data || [],
        personalizationTypes: resPerso.data || [], 
        inventory: resInventory.data || [], 
        services: resServices.data || [], 
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
      const { data: existing } = await supabase.from('product_variants').select('*').eq('product_id', productId).eq('size_id', sizeId).eq('color_id', colorId).single();
      
      if (existing) {
        const newTotal = existing.stock_quantity + quantity;
        const newBase = (existing.base_quantity || 0) + quantity;
        
        await supabase.from('product_variants').update({ 
          stock_quantity: newTotal,
          base_quantity: newBase 
        }).eq('id', existing.id);
      } else {
        await supabase.from('product_variants').insert([{ 
          product_id: productId, 
          size_id: sizeId, 
          color_id: colorId, 
          stock_quantity: quantity,
          base_quantity: quantity 
        }]);
      }
      await get().fetchAllCatalogs();
    } catch (error) { 
      console.error('Error al actualizar stock:', error); 
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

  // ✨ FUNCIÓN NUEVA Y LIMPIA: PROCESA LA VENTA DESCONTANDO SOLO EL STOCK FÍSICO
  processSale: async (customerId, cart, total) => {
    try {
      for (const item of cart) {
        const { data: variant } = await supabase.from('product_variants').select('finished_quantity').eq('id', item.variantId).single();
        if (variant) {
          await supabase.from('product_variants').update({ 
            finished_quantity: variant.finished_quantity - item.qty 
          }).eq('id', item.variantId);
        }
      }
      // Refrescamos el catálogo para ver el stock real
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
    set((state) => ({ services: [...state.services, data].sort((a, b) => a.name.localeCompare(b.name)) }));
    return data as Service;
  },

  addCustomer: async (customerData) => {
    const companyId = useTenantStore.getState().activeCompanyId;
    const { data, error } = await supabase.from('customers').insert([{ ...customerData, company_id: companyId }]).select().single();
    if (error) throw error;
    set((state) => ({ customers: [...state.customers, data].sort((a, b) => a.name.localeCompare(b.name)) }));
    return data as Customer;
  },

  addProduct: async (productData) => {
    const companyId = useTenantStore.getState().activeCompanyId;
    const { data, error } = await supabase.from('products').insert([{ ...productData, company_id: companyId }]).select().single();
    if (error) throw error;
    set((state) => ({ products: [...state.products, data].sort((a, b) => a.name.localeCompare(b.name)) }));
    return data as Product;
  },

  addSize: async (name) => {
    const { data, error } = await supabase.from('sizes').insert([{ name }]).select().single();
    if (error) throw error;
    set((state) => ({ sizes: [...state.sizes, data].sort((a, b) => a.name.localeCompare(b.name)) }));
    return data as CatalogItem;
  },

  addColor: async (name, hex_code = '#000000') => {
    const { data, error } = await supabase.from('colors').insert([{ name, hex_code }]).select().single();
    if (error) throw error;
    set((state) => ({ colors: [...state.colors, data].sort((a, b) => a.name.localeCompare(b.name)) }));
    return data as CatalogItem;
  },

  addPersonalizationType: async (name, base_price) => {
    const { data, error } = await supabase.from('personalization_types').insert([{ name, base_price }]).select().single();
    if (error) throw error;
    set((state) => ({ personalizationTypes: [...state.personalizationTypes, data].sort((a, b) => a.name.localeCompare(b.name)) }));
    return data as CatalogItem;
  },

  // ✨ CORREGIDO: AHORA GUARDA EN LA CUENTA CORRIENTE NUEVA
  registerPayment: async (customerId, amount, notes) => {
    try {
      const type = amount < 0 ? 'CARGO' : 'PAGO';
      const absAmount = Math.abs(amount);
      
      const { error: txError } = await supabase.from('account_movements').insert([{ 
        customer_id: customerId, 
        movement_type: type, 
        amount: absAmount, 
        description: notes 
      }]);
      
      if (txError) throw txError;
      await get().fetchAllCatalogs();
    } catch (error: any) { 
      console.error('Error registrando pago:', error.message); 
      throw error; 
    }
  }
}));