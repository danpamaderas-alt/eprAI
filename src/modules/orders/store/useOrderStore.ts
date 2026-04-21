import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
// Importamos el store del catálogo para poder actualizar la pantalla de inventario en tiempo real
import { useCatalogStore } from '../../../store/useCatalogStore'; 

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
      // 1. Guardamos el pedido principal en Supabase
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Descontamos el stock recorriendo los items del pedido
      // Asumimos que la estructura es items: [{ productId, variations: [{ sizeId, colorId, quantity }] }]
      for (const item of orderData.items) {
        if (item.variations && Array.isArray(item.variations)) {
          for (const variant of item.variations) {
            
            // Buscamos cuánto stock hay actualmente de ese talle/color exacto
            const { data: existingStock } = await supabase
              .from('product_variants')
              .select('id, stock_quantity')
              .eq('product_id', item.productId || item.id) // Depende de cómo lo llames en tu form
              .eq('size_id', variant.sizeId)
              .eq('color_id', variant.colorId)
              .single();

            // Si existe en el inventario, le restamos la cantidad del pedido
            if (existingStock) {
              const newQuantity = existingStock.stock_quantity - variant.quantity;
              
              await supabase
                .from('product_variants')
                .update({ stock_quantity: newQuantity })
                .eq('id', existingStock.id);
            }
          }
        }
      }

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