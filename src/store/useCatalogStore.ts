import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// --- INTERFACES ---
export interface CatalogItem { id: string; name: string; hex_code?: string; base_price?: number; }
export interface BusinessUnit { id: string; code: string; name: string; }

export interface Product { 
  id: string; 
  sku?: string;        
  name: string; 
  category?: string; 
  cost?: number;       
  price?: number;      
  location?: string;   
  notes?: string;      
  base_price?: number; 
  purchase_price?: number; 
}

export interface Service {
  id: string;
  name: string;
  price: number;
  description?: string;
}

export interface Customer { 
  id: string; 
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
  
  // 🔥 DEVOLVEMOS LAS FUNCIONES QUE USAN LOS OTROS MÓDULOS
  addService: (data: Omit<Service, 'id'>) => Promise<Service>;
  addCustomer: (data: Omit<Customer, 'id' | 'balance'>) => Promise<Customer>;
  addProduct: (data: Omit<Product, 'id'>) => Promise<Product>;
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
    try {
      const [ resSizes, resColors, resPayments, resUnits, resProducts, resCustomers, resPerso, resInventory, resServices ] = await Promise.all([
        supabase.from('sizes').select('*').order('name'),
        supabase.from('colors').select('*').order('name'),
        supabase.from('payment_methods').select('*').order('name'),
        supabase.from('business_units').select('*').order('name'),
        supabase.from('products').select('id, sku, name, category, cost, price, location, notes, base_price, purchase_price').order('name'),
        supabase.from('customers').select('*').order('name'),
        supabase.from('personalization_types').select('*').order('name'),
        supabase.from('product_variants').select(`*, sizes(name), colors(name)`),
        supabase.from('services').select('*').order('name'),
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
      const { data: existing } = await supabase.from('product_variants').select('id, stock_quantity').eq('product_id', productId).eq('size_id', sizeId).eq('color_id', colorId).single();
      if (existing) {
        await supabase.from('product_variants').update({ stock_quantity: existing.stock_quantity + quantity }).eq('id', existing.id);
      } else {
        await supabase.from('product_variants').insert([{ product_id: productId, size_id: sizeId, color_id: colorId, stock_quantity: quantity }]);
      }
      await get().fetchAllCatalogs();
    } catch (error) { 
      console.error('Error al actualizar stock:', error); 
      throw error; 
    }
  },

  addService: async (serviceData) => {
    const { data, error } = await supabase.from('services').insert([serviceData]).select().single();
    if (error) throw error;
    set((state) => ({ 
      services: [...state.services, data].sort((a, b) => a.name.localeCompare(b.name)) 
    }));
    return data as Service;
  },

  addCustomer: async (customerData) => {
    const { data, error } = await supabase.from('customers').insert([customerData]).select().single();
    if (error) throw error;
    set((state) => ({ customers: [...state.customers, data].sort((a, b) => a.name.localeCompare(b.name)) }));
    return data as Customer;
  },

  addProduct: async (productData) => {
    const { data, error } = await supabase.from('products').insert([productData]).select().single();
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

  registerPayment: async (customerId, amount, notes) => {
    try {
      const type = amount < 0 ? 'DEBIT' : 'CREDIT';
      const absAmount = Math.abs(amount);
      const { error: txError } = await supabase.from('client_movements').insert([{ customer_id: customerId, type: type, amount: absAmount, description: notes }]);
      if (txError) throw txError;
      
      const customer = get().customers.find(c => c.id === customerId);
      const newBalance = type === 'DEBIT' ? (Number(customer?.balance || 0)) + absAmount : (Number(customer?.balance || 0)) - absAmount;
      
      const { error: custError } = await supabase.from('customers').update({ balance: newBalance }).eq('id', customerId);
      if (custError) throw custError;
      
      await get().fetchAllCatalogs();
    } catch (error: any) { 
      console.error('Error Crítico:', error.message); 
      throw error; 
    }
  }

}));