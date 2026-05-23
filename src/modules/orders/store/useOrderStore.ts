import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
// Importamos el store del catálogo para poder actualizar la pantalla de inventario en tiempo real
import { useCatalogStore } from '../../../store/useCatalogStore'; 

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
  registerPartialDelivery: (orderId: string, deliveryData: any) => Promise<void>;
  // ✅ NUEVA FUNCIÓN: Crear Pedido y Descontar Stock
  createOrder: (orderData: Omit<Order, 'id'>) => Promise<void>;
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

  // ✅ LÓGICA PARA CREAR PEDIDO Y DESCONTAR STOCK AUTOMÁTICAMENTE
  createOrder: async (orderData) => {
    try {
      // VANGUARDIA (Atomicidad y Rendimiento):
      // Delegamos la creación del pedido y el descuento de stock a una sola transacción SQL.
      const { error } = await supabase.rpc('create_order_atomic', {
        order_payload: orderData
      });

      if (error) throw error;

      // 3. Recargamos los pedidos y le avisamos al inventario que se actualice
      await get().fetchOrders();
      await useCatalogStore.getState().fetchAllCatalogs();

    } catch (error) {
      console.error("❌ Error al crear pedido y descontar stock:", error);
      throw error;
    }
  },

  registerPartialDelivery: async (orderId, deliveryData) => {
    const { data: order } = await supabase
      .from('orders')
      .select('items, status')
      .eq('id', orderId)
      .single();

    if (!order) return;

    const updatedItems = order.items.map((item: OrderItem) => {
      const deliveryItem = deliveryData.itemsDelivered.find((d: any) => d.itemId === item.id);
      if (deliveryItem) {
        return {
          ...item,
          variations: item.variations.map((v: OrderVariation) => {
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