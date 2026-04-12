import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import { type Order, type DeliveryLog } from '../schemas/orderSchema';
import { useCatalogStore } from '../../../store/useCatalogStore'; // ⬅️ Importamos el cerebro del stock
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

  fetchOrders: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('due_date', { ascending: true });

      if (error) throw error;
      
      const mappedOrders = data.map(d => ({
        id: d.id,
        customerName: d.customer_name,
        businessUnit: d.business_unit,
        status: d.status,
        dueDate: d.due_date,
        totalAmount: Number(d.total_amount) || 0,
        advancePayment: Number(d.advance_payment) || 0,
        items: d.items || [],
        deliveryHistory: d.delivery_history || [],
        created_at: d.created_at
      }));

      set({ orders: mappedOrders as Order[], isLoading: false });
    } catch (error) {
      console.error('Error cargando pedidos:', error);
      set({ isLoading: false });
    }
  },

  addOrder: async (orderData) => {
    const dbData = {
      customer_name: orderData.customerName,
      business_unit: orderData.businessUnit,
      status: orderData.status || 'PENDING',
      due_date: orderData.dueDate,
      total_amount: orderData.totalAmount || 0,
      advance_payment: orderData.advancePayment || 0,
      items: orderData.items,
      delivery_history: orderData.deliveryHistory || []
    };
    
    try {
      const { error } = await supabase.from('orders').insert([dbData]);
      if (error) throw error;
      get().fetchOrders(); 
    } catch (error) {
      console.error('Error guardando pedido:', error);
      Swal.fire('Error', 'No se pudo guardar el pedido en la nube', 'error');
      throw error;
    }
  },

  registerPartialDelivery: async (orderId, deliveryData) => {
    const currentOrder = get().orders.find(o => o.id === orderId);
    if (!currentOrder) return;

    const newLog: DeliveryLog = {
      ...deliveryData,
      id: crypto.randomUUID(),
    };

    let isOrderFullyDelivered = true;

    // 1. Calculamos las nuevas cantidades y preparamos el descuento de stock
    const updatedItems = currentOrder.items.map(item => {
      const updatedVariations = item.variations.map(variation => {
        // Buscamos si esta variante específica se entregó en este remito
        const deliveredThisTime = newLog.itemsDelivered.find(
          d => d.itemId === item.id && d.variationId === variation.id
        )?.quantity || 0;

        const totalDelivered = (variation.quantityDelivered || 0) + deliveredThisTime;
        
        if (totalDelivered < variation.quantityOrdered) {
          isOrderFullyDelivered = false;
        }

        return { ...variation, quantityDelivered: totalDelivered };
      });

      return { ...item, variations: updatedVariations };
    });

    const newStatus = isOrderFullyDelivered ? 'DELIVERED' : 'PARTIAL';
    const newDeliveryHistory = [...(currentOrder.deliveryHistory || []), newLog];

    try {
      // 2. 🔥 MAGIA: DESCONTAR DEL GALPÓN REAL
      // Recorremos lo que se entregó "ahora" para bajar el stock
 // 2. 🔥 MAGIA: DESCONTAR DEL GALPÓN REAL
      for (const delivered of deliveryData.itemsDelivered) {
        const item = currentOrder.items.find((i: any) => i.id === delivered.itemId) as any;
        
        // Si el item del pedido tiene los IDs de producto, talle y color...
        if (item && item.productId && item.sizeId && item.colorId) {
          await useCatalogStore.getState().updateStock(
            item.productId,
            item.sizeId,
            item.colorId,
            -delivered.quantity
          );
        }
      }

      // 3. Actualizamos Supabase con la nueva historia de entrega
      const { error } = await supabase
        .from('orders')
        .update({
          items: updatedItems,
          delivery_history: newDeliveryHistory,
          status: newStatus
        })
        .eq('id', orderId);

      if (error) throw error;

      // 4. Refrescamos para ver los cambios en la Hoja de Ruta
      get().fetchOrders();

    } catch (error) {
      console.error('Error en proceso de entrega/stock:', error);
      Swal.fire('Error', 'No se pudo registrar la entrega o descontar stock', 'error');
      throw error;
    }
  }
}));