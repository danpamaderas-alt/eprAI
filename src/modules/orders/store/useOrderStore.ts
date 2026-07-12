import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import { useCatalogStore } from '../../../store/useCatalogStore'; 
import { useTenantStore } from '../../../store/useTenantStore';

export interface OrderVariation {
  sizeId: string;
  colorId: string;
  quantity: number;
  quantityDelivered?: number;
  variationId?: string;
}

export interface OrderItem {
  id?: string;
  productId?: string;
  variations: OrderVariation[];
}

export interface Order {
  id: string;
  company_id?: string;
  customer_name: string;
  total_amount: number;
  advance_payment: number;
  status: 'PENDING' | 'PARTIAL' | 'DELIVERED' | 'CANCELLED';
  due_date: string;
  business_unit: string;
  items: OrderItem[];
}

interface OrderState {
  orders: Order[];
  isLoading: boolean;
  fetchOrders: () => Promise<void>;
  registerPartialDelivery: (orderId: string, deliveryData: Record<string, unknown>) => Promise<void>;
  createOrder: (orderData: Omit<Order, 'id'>) => Promise<void>;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  isLoading: false,

  fetchOrders: async () => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) return;

    set({ isLoading: true });
    
    const { data, error } = await supabase
      .from('orders')
      .select('id, company_id, customer_name, total_amount, advance_payment, status, due_date, business_unit, items, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (!error) {
      set({ orders: data || [], isLoading: false });
    } else {
      console.error("Error fetching 'orders':", error.message);
      set({ isLoading: false });
    }
  },

  createOrder: async (orderData) => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) throw new Error("No hay una empresa activa seleccionada para crear el pedido.");

    const payloadWithTenant = { ...orderData, company_id: companyId };

    const { data, error: rpcError } = await supabase.rpc('create_order_atomic', {
      order_payload: payloadWithTenant
    });

    if (rpcError) {
      console.error("Error en create_order_atomic:", rpcError.message);
      throw new Error(`Error creando pedido: ${rpcError.message}`);
    }

    await get().fetchOrders();
    await useCatalogStore.getState().fetchAllCatalogs();
  },

  registerPartialDelivery: async (orderId, deliveryData) => {
    try {
      const { error } = await supabase.rpc('register_partial_delivery', {
        p_order_id: orderId,
        p_delivery_data: deliveryData
      });

      if (error) throw error;
      
      await get().fetchOrders();
    } catch (error) {
      throw error;
    }
  }
}));