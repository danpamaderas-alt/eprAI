import { create } from 'zustand';
import { supabase } from '../../../lib/supabase'; // Asegurate de que esta ruta coincida con tu archivo supabase.ts
import { type Order, type DeliveryLog } from '../schemas/orderSchema';
import Swal from 'sweetalert2';

interface OrderState {
  orders: Order[];
  isLoading: boolean;
  fetchOrders: () => Promise<void>;
  addOrder: (order: Omit<Order, 'id' | 'created_at'>) => Promise<void>;
  registerPartialDelivery: (orderId: string, delivery: Omit<DeliveryLog, 'id'>) => Promise<void>;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  isLoading: false,

  // 1. TRAER PEDIDOS DE LA BASE DE DATOS
  fetchOrders: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Supabase nos devuelve los JSONB perfectamente formateados
      set({ orders: data as Order[], isLoading: false });
    } catch (error) {
      console.error('Error cargando pedidos:', error);
      set({ isLoading: false });
    }
  },

  // 2. GUARDAR UN NUEVO PEDIDO EN LA NUBE
  addOrder: async (orderData) => {
    const newOrder = {
      ...orderData,
      // No mandamos ID ni created_at porque Supabase los genera automáticamente con el SQL que corrimos
    };
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert([newOrder])
        .select()
        .single();

      if (error) throw error;

      // Actualizamos la pantalla al instante con el dato real de la base de datos
      set((state) => ({ orders: [data as Order, ...state.orders] }));
    } catch (error) {
      console.error('Error guardando pedido:', error);
      Swal.fire('Error', 'No se pudo guardar el pedido en la nube', 'error');
    }
  },

  // 3. REGISTRAR UNA ENTREGA PARCIAL Y ACTUALIZAR LA NUBE
  registerPartialDelivery: async (orderId, deliveryData) => {
    const currentOrder = get().orders.find(o => o.id === orderId);
    if (!currentOrder) return;

    const newLog: DeliveryLog = {
      ...deliveryData,
      id: crypto.randomUUID(),
    };

    let isOrderFullyDelivered = true;

    // Calculamos las nuevas cantidades
    const updatedItems = currentOrder.items.map(item => {
      const updatedVariations = item.variations.map(variation => {
        const deliveredThisTime = newLog.itemsDelivered.find(
          d => d.itemId === item.id && d.variationId === variation.id
        )?.quantity || 0;

        const totalDelivered = variation.quantityDelivered + deliveredThisTime;
        
        if (totalDelivered < variation.quantityOrdered) {
          isOrderFullyDelivered = false;
        }

        return { ...variation, quantityDelivered: totalDelivered };
      });

      return { ...item, variations: updatedVariations };
    });

    const newStatus = isOrderFullyDelivered ? 'DELIVERED' : 'PARTIAL';
    const newDeliveryHistory = [...currentOrder.deliveryHistory, newLog];

    try {
      // Mandamos la actualización a Supabase
      const { error } = await supabase
        .from('orders')
        .update({
          items: updatedItems,
          deliveryHistory: newDeliveryHistory,
          status: newStatus
        })
        .eq('id', orderId);

      if (error) throw error;

      // Si Supabase dijo que OK, actualizamos la pantalla
      set((state) => ({
        orders: state.orders.map(order => 
          order.id === orderId 
            ? { ...order, items: updatedItems, deliveryHistory: newDeliveryHistory, status: newStatus } 
            : order
        )
      }));

    } catch (error) {
      console.error('Error actualizando entrega:', error);
      Swal.fire('Error', 'Hubo un problema de conexión al registrar la entrega', 'error');
    }
  }
}));