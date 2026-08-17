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

export type OrderPriority = 'LOW' | 'NORMAL' | 'URGENT';
export type ProductionStage = 'CUTTING' | 'SEWING' | 'FINISHING' | 'QC' | 'PACKING' | 'DELIVERING';

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  action: string;
  detail: string;
  user?: string;
}

export interface OrderNote {
  id: string;
  timestamp: string;
  text: string;
  user?: string;
  pinned?: boolean;
}

export interface OrderPayment {
  id: string;
  date: string;
  amount: number;
  method: string;
  note?: string;
}

export interface OrderPhoto {
  id: string;
  url: string;
  name: string;
  timestamp: string;
}

export interface OrderTemplate {
  id: string;
  name: string;
  customer_name: string;
  business_unit: string;
  items: OrderItem[];
  total_amount: number;
  advance_payment: number;
  created_at: string;
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
  created_at?: string;
  priority?: OrderPriority;
  production_stage?: ProductionStage;
  activity_log?: ActivityLogEntry[];
  notes?: OrderNote[];
  payments?: OrderPayment[];
  photos?: OrderPhoto[];
  customer_phone?: string;
  customer_email?: string;
  internal_notes?: string;
}

interface OrderState {
  orders: Order[];
  templates: OrderTemplate[];
  isLoading: boolean;
  viewMode: 'list' | 'kanban' | 'calendar';
  selectedOrders: Set<string>;
  fetchOrders: () => Promise<void>;
  registerPartialDelivery: (orderId: string, deliveryData: Record<string, unknown>) => Promise<void>;
  createOrder: (orderData: Omit<Order, 'id'>) => Promise<void>;
  updateOrder: (orderId: string, updates: Partial<Order>) => Promise<void>;
  addNote: (orderId: string, text: string) => void;
  addPayment: (orderId: string, amount: number, method: string, note?: string) => void;
  addActivityLog: (orderId: string, action: string, detail: string) => void;
  setPriority: (orderId: string, priority: OrderPriority) => void;
  setProductionStage: (orderId: string, stage: ProductionStage) => void;
  setViewMode: (mode: 'list' | 'kanban' | 'calendar') => void;
  toggleOrderSelection: (orderId: string) => void;
  selectAllOrders: (orderIds: string[]) => void;
  clearSelection: () => void;
  bulkChangeStatus: (status: Order['status']) => void;
  duplicateOrder: (orderId: string) => void;
  saveTemplate: (name: string, order: Order) => void;
  deleteTemplate: (id: string) => void;
  addPhoto: (orderId: string, url: string, name: string) => void;
}

const STORAGE_KEY = 'epr_orders_meta';

function loadMeta(): Record<string, Partial<Order>> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveMeta(orders: Order[]) {
  const meta: Record<string, Partial<Order>> = {};
  orders.forEach((o) => {
    meta[o.id] = {
      priority: o.priority,
      production_stage: o.production_stage,
      activity_log: o.activity_log,
      notes: o.notes,
      payments: o.payments,
      photos: o.photos,
      customer_phone: o.customer_phone,
      customer_email: o.customer_email,
      internal_notes: o.internal_notes,
    };
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
}

function loadTemplates(): OrderTemplate[] {
  try {
    return JSON.parse(localStorage.getItem('epr_order_templates') || '[]');
  } catch {
    return [];
  }
}

function saveTemplates(templates: OrderTemplate[]) {
  localStorage.setItem('epr_order_templates', JSON.stringify(templates));
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  templates: loadTemplates(),
  isLoading: false,
  viewMode: 'list',
  selectedOrders: new Set<string>(),

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
      const meta = loadMeta();
      const enriched = (data || []).map((o) => ({
        ...o,
        ...meta[o.id],
      }));
      set({ orders: enriched, isLoading: false });
    } else {
      console.error("Error fetching 'orders':", error.message);
      set({ isLoading: false });
    }
  },

  createOrder: async (orderData) => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) throw new Error("No hay una empresa activa seleccionada para crear el pedido.");

    const payloadWithTenant = { ...orderData, company_id: companyId };

    const { error: rpcError } = await supabase.rpc('create_order_atomic', {
      order_payload: payloadWithTenant,
    });

    if (rpcError) {
      console.error("Error en create_order_atomic:", rpcError.message);
      throw new Error(`Error creando pedido: ${rpcError.message}`);
    }

    await get().fetchOrders();
    await useCatalogStore.getState().fetchAllCatalogs();
  },

  updateOrder: async (orderId, updates) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.total_amount !== undefined) dbUpdates.total_amount = updates.total_amount;
    if (updates.advance_payment !== undefined) dbUpdates.advance_payment = updates.advance_payment;
    if (updates.due_date !== undefined) dbUpdates.due_date = updates.due_date;
    if (updates.customer_name !== undefined) dbUpdates.customer_name = updates.customer_name;
    if (updates.items !== undefined) dbUpdates.items = updates.items;

    if (Object.keys(dbUpdates).length > 0) {
      const { error } = await supabase.from('orders').update(dbUpdates).eq('id', orderId);
      if (error) throw error;
    }

    set((state) => {
      const updated = state.orders.map((o) =>
        o.id === orderId ? { ...o, ...updates } : o,
      );
      saveMeta(updated);
      return { orders: updated };
    });
  },

  registerPartialDelivery: async (orderId, deliveryData) => {
    try {
      const { error } = await supabase.rpc('register_partial_delivery', {
        p_order_id: orderId,
        p_delivery_data: deliveryData,
      });

      if (error) throw error;
      await get().fetchOrders();
    } catch (error) {
      throw error;
    }
  },

  addNote: (orderId, text) => {
    const note: OrderNote = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      text,
      user: 'Usuario',
    };
    set((state) => {
      const updated = state.orders.map((o) =>
        o.id === orderId ? { ...o, notes: [...(o.notes || []), note] } : o,
      );
      saveMeta(updated);
      return { orders: updated };
    });
  },

  addPayment: (orderId, amount, method, note) => {
    const payment: OrderPayment = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      amount,
      method,
      note,
    };
    set((state) => {
      const updated = state.orders.map((o) => {
        if (o.id !== orderId) return o;
        const newAdvance = (o.advance_payment || 0) + amount;
        return { ...o, payments: [...(o.payments || []), payment], advance_payment: newAdvance };
      });
      saveMeta(updated);
      return { orders: updated };
    });
  },

  addActivityLog: (orderId, action, detail) => {
    const entry: ActivityLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      action,
      detail,
      user: 'Usuario',
    };
    set((state) => {
      const updated = state.orders.map((o) =>
        o.id === orderId ? { ...o, activity_log: [...(o.activity_log || []), entry] } : o,
      );
      saveMeta(updated);
      return { orders: updated };
    });
  },

  setPriority: (orderId, priority) => {
    set((state) => {
      const updated = state.orders.map((o) =>
        o.id === orderId ? { ...o, priority } : o,
      );
      saveMeta(updated);
      return { orders: updated };
    });
  },

  setProductionStage: (orderId, stage) => {
    const entry: ActivityLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      action: 'STAGE_CHANGE',
      detail: `Etapa: ${stage}`,
      user: 'Usuario',
    };
    set((state) => {
      const updated = state.orders.map((o) =>
        o.id === orderId
          ? { ...o, production_stage: stage, activity_log: [...(o.activity_log || []), entry] }
          : o,
      );
      saveMeta(updated);
      return { orders: updated };
    });
  },

  setViewMode: (mode) => set({ viewMode: mode }),

  toggleOrderSelection: (orderId) => {
    set((state) => {
      const next = new Set(state.selectedOrders);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return { selectedOrders: next };
    });
  },

  selectAllOrders: (orderIds) => {
    set({ selectedOrders: new Set(orderIds) });
  },

  clearSelection: () => set({ selectedOrders: new Set() }),

  bulkChangeStatus: (status) => {
    const { selectedOrders } = get();
    selectedOrders.forEach((id) => {
      get().updateOrder(id, { status });
    });
    set({ selectedOrders: new Set() });
  },

  duplicateOrder: (orderId) => {
    const order = get().orders.find((o) => o.id === orderId);
    if (!order) return;
    const duplicate: Order = {
      ...order,
      id: crypto.randomUUID(),
      status: 'PENDING',
      advance_payment: 0,
      created_at: new Date().toISOString(),
      priority: 'NORMAL',
      production_stage: 'CUTTING',
      activity_log: [],
      notes: [],
      payments: [],
      photos: [],
    };
    set((state) => ({ orders: [duplicate, ...state.orders] }));
  },

  saveTemplate: (name, order) => {
    const template: OrderTemplate = {
      id: crypto.randomUUID(),
      name,
      customer_name: order.customer_name,
      business_unit: order.business_unit,
      items: order.items,
      total_amount: order.total_amount,
      advance_payment: order.advance_payment,
      created_at: new Date().toISOString(),
    };
    const templates = [...get().templates, template];
    saveTemplates(templates);
    set({ templates });
  },

  deleteTemplate: (id) => {
    const templates = get().templates.filter((t) => t.id !== id);
    saveTemplates(templates);
    set({ templates });
  },

  addPhoto: (orderId, url, name) => {
    const photo: OrderPhoto = {
      id: crypto.randomUUID(),
      url,
      name,
      timestamp: new Date().toISOString(),
    };
    set((state) => {
      const updated = state.orders.map((o) =>
        o.id === orderId ? { ...o, photos: [...(o.photos || []), photo] } : o,
      );
      saveMeta(updated);
      return { orders: updated };
    });
  },
}));
