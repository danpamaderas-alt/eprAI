import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';

export interface Order {
  id: string;
  customer_name: string;
  total_amount: number;
  advance_payment: number;
  status: 'PENDING' | 'PARTIAL' | 'DELIVERED' | 'CANCELLED';
  due_date: string;
  business_unit: string;
  items: any[];
}

interface OrderState {
  orders: Order[];
  isLoading: boolean;
  fetchOrders: () => Promise<void>;
  registerPartialDelivery: (orderId: string, deliveryData: any) => Promise<void>;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  isLoading: false,

  fetchOrders: async () => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) {
      set({ orders: data || [], isLoading: false });
    } else {
      console.error("Error cargando pedidos:", error);
      set({ isLoading: false });
    }
  },

  registerPartialDelivery: async (orderId, deliveryData) => {
    const { data: order } = await supabase
      .from('orders')
      .select('items, status')
      .eq('id', orderId)
      .single();

    if (!order) return;

    const updatedItems = order.items.map((item: any) => {
      const deliveryItem = deliveryData.itemsDelivered.find((d: any) => d.itemId === item.id);
      if (deliveryItem) {
        return {
          ...item,
          variations: item.variations.map((v: any) => {
            if (v.id === deliveryItem.variationId) {
              return { ...v, quantityDelivered: (v.quantityDelivered || 0) + deliveryItem.quantity };
            }
            return v;
          })
        };
      }
      return item;
    });
    
    const { error } = await supabase
      .from('orders')
      .update({ 
        items: updatedItems,
        status: 'PARTIAL' 
      })
      .eq('id', orderId);

    if (error) throw error;
    await get().fetchOrders();
  }
}));