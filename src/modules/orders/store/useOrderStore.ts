import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import { useCatalogStore } from '../../../store/useCatalogStore';
import { useTenantStore } from '../../../store/useTenantStore';
import type { Database } from '../../../shared/types/database.types';
import {
  applyDeliveriesToItems,
  describeDeliveries,
  deriveStatus,
  normalizeOrderItems,
  serializeOrderItems,
  type DeliveryTarget,
} from '../utils/orderItems';

type OrderDbUpdate = Database['public']['Tables']['orders']['Update'];

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
  design_id?: string | null;
  design_product?: string | null;
  design_verdict?: 'ok' | 'warn' | 'bad' | null;
  design_client_approved?: boolean | null;
  design_approved_at?: string | null;
}

interface OrderState {
  orders: Order[];
  templates: OrderTemplate[];
  isLoading: boolean;
  viewMode: 'list' | 'kanban' | 'calendar';
  selectedOrders: Set<string>;
fetchOrders: () => Promise<void>;
  registerPartialDelivery: (orderId: string, deliveries: DeliveryTarget[]) => Promise<void>;
  createOrder: (orderData: Omit<Order, 'id'>) => Promise<void>;
  updateOrder: (orderId: string, updates: Partial<Order>) => Promise<void>;
  addNote: (orderId: string, text: string) => Promise<void>;
  addPayment: (orderId: string, amount: number, method: string, note?: string) => Promise<void>;
  addActivityLog: (orderId: string, action: string, detail: string) => Promise<void>;
  setPriority: (orderId: string, priority: OrderPriority) => Promise<void>;
  setProductionStage: (orderId: string, stage: ProductionStage) => Promise<void>;
  setViewMode: (mode: 'list' | 'kanban' | 'calendar') => void;
  toggleOrderSelection: (orderId: string) => void;
  selectAllOrders: (orderIds: string[]) => void;
clearSelection: () => void;
  bulkChangeStatus: (status: Order['status']) => Promise<void>;
  duplicateOrder: (orderId: string) => void;
  saveTemplate: (name: string, order: Order) => void;
  deleteTemplate: (id: string) => void;
  addPhoto: (orderId: string, url: string, name: string) => Promise<void>;
}

const META_COLUMNS = 'priority, production_stage, activity_log, notes, payments, photos, customer_phone, customer_email, internal_notes, design_id, design_product, design_verdict, design_client_approved, design_approved_at';

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

const Swal = {
  fire: async (...args: [options?: import('sweetalert2').SweetAlertOptions]) => {
    const m = (await import('sweetalert2')).default as unknown as { fire: (...a: [options?: import('sweetalert2').SweetAlertOptions]) => Promise<unknown> };
    return m.fire(...args);
  },
};

async function persistMeta(orderId: string, patch: Record<string, unknown>) {
  const { error } = await supabase.from('orders').update(patch as OrderDbUpdate).eq('id', orderId);
  if (error) {
    console.error('Error persisting order meta:', error.message);
    void Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'No se pudo sincronizar el pedido', showConfirmButton: false, timer: 3000 });
    throw error;
  }
}

/** PostgREST: la función RPC todavía no existe (falta aplicar sql/031). */
function isMissingFunctionError(err: { code?: string; message?: string }): boolean {
  return err.code === 'PGRST202' || err.code === '404' || err.code === '42883' || /could not find the function/i.test(err.message || '');
}
export const useOrderStore = create<OrderState>((set, get) => ({  orders: [],
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
      .select(`id, company_id, customer_name, total_amount, advance_payment, status, due_date, business_unit, items, created_at, ${META_COLUMNS}`)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (!error) {
      set({ orders: (data || []) as unknown as Order[], isLoading: false });
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
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.production_stage !== undefined) dbUpdates.production_stage = updates.production_stage;
    if (updates.activity_log !== undefined) dbUpdates.activity_log = updates.activity_log;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.payments !== undefined) dbUpdates.payments = updates.payments;
    if (updates.photos !== undefined) dbUpdates.photos = updates.photos;
    if (updates.customer_phone !== undefined) dbUpdates.customer_phone = updates.customer_phone;
    if (updates.customer_email !== undefined) dbUpdates.customer_email = updates.customer_email;
    if (updates.internal_notes !== undefined) dbUpdates.internal_notes = updates.internal_notes;

    if (Object.keys(dbUpdates).length > 0) {
      const { error } = await supabase.from('orders').update(dbUpdates as OrderDbUpdate).eq('id', orderId);
      if (error) throw error;
    }

    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId ? { ...o, ...updates } : o,
      ),
    }));
  },

registerPartialDelivery: async (orderId, deliveries) => {
    const current = get().orders.find((o) => o.id === orderId);
    if (!current) throw new Error('Pedido no encontrado');
    if (current.status === 'CANCELLED') throw new Error('El pedido está cancelado');

    const normalized = normalizeOrderItems(current.items);
    const logEntry: ActivityLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      action: 'DELIVERY',
      detail: describeDeliveries(normalized, deliveries),
      user: 'Usuario',
    };

    // Camino atómico preferido: RPC que persiste quantityDelivered + status + log
    // en una sola transacción (sql/031_register_delivery_v2.sql).
    const { error: rpcError } = await supabase.rpc('register_delivery_v2', {
      p_order_id: orderId,
      p_deliveries: deliveries,
      p_log_entry: logEntry,
    });
    if (!rpcError) {
      await get().fetchOrders();
      return;
    }
    if (!isMissingFunctionError(rpcError)) {
      throw new Error(`Error registrando entrega: ${rpcError.message}`);
    }

    // Fallback mientras no se aplique la migración: lectura fresca + UN solo
    // UPDATE con items/status/activity_log calculados client-side.
    const { data, error: fetchError } = await supabase
      .from('orders')
      .select('items, status, activity_log')
      .eq('id', orderId)
      .single();
    if (fetchError) throw fetchError;
    const row = (data ?? {}) as { items?: unknown; status?: string | null; activity_log?: unknown };
    if ((row.status || '').toUpperCase() === 'CANCELLED') throw new Error('El pedido está cancelado');

    const applied = applyDeliveriesToItems(normalizeOrderItems(row.items), deliveries);
    const prevLog = Array.isArray(row.activity_log) ? row.activity_log : [];
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        items: serializeOrderItems(applied.items) as OrderDbUpdate['items'],
        status: deriveStatus(applied.orderedTotal, applied.deliveredTotal),
        activity_log: [...prevLog, logEntry] as OrderDbUpdate['activity_log'],
      })
      .eq('id', orderId);
    if (updateError) throw updateError;
    await get().fetchOrders();
  },

  addNote: async (orderId, text) => {
    const note: OrderNote = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      text,
      user: 'Usuario',
    };
    const prev = get().orders;
    const current = prev.find((o) => o.id === orderId);
    if (!current) return;
    const newNotes = [...(current.notes || []), note];
    set({
      orders: prev.map((o) =>
        o.id === orderId ? { ...o, notes: newNotes } : o,
      ),
    });
    try { await persistMeta(orderId, { notes: newNotes }); } catch { set({ orders: prev }); }
  },

  addPayment: async (orderId, amount, method, note) => {
    const payment: OrderPayment = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      amount,
      method,
      note,
    };
    const prev = get().orders;
    const current = prev.find((o) => o.id === orderId);
    if (!current) return;
    const newPayments = [...(current.payments || []), payment];
    const newAdvance = (current.advance_payment || 0) + amount;
    set({
      orders: prev.map((o) =>
        o.id === orderId
          ? { ...o, payments: newPayments, advance_payment: newAdvance }
          : o,
      ),
    });
    try {
      await persistMeta(orderId, { payments: newPayments, advance_payment: newAdvance });
    } catch {
      set({ orders: prev });
    }
  },

  addActivityLog: async (orderId, action, detail) => {
    const entry: ActivityLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      action,
      detail,
      user: 'Usuario',
    };
    const prev = get().orders;
    const current = prev.find((o) => o.id === orderId);
    if (!current) return;
    const newLog = [...(current.activity_log || []), entry];
    set({
      orders: prev.map((o) =>
        o.id === orderId ? { ...o, activity_log: newLog } : o,
      ),
    });
    try { await persistMeta(orderId, { activity_log: newLog }); } catch { set({ orders: prev }); }
  },

  setPriority: async (orderId, priority) => {
    const prev = get().orders;
    if (!prev.some((o) => o.id === orderId)) return;
    set({
      orders: prev.map((o) =>
        o.id === orderId ? { ...o, priority } : o,
      ),
    });
    try { await persistMeta(orderId, { priority }); } catch { set({ orders: prev }); }
  },

  setProductionStage: async (orderId, stage) => {
    const entry: ActivityLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      action: 'STAGE_CHANGE',
      detail: `Etapa: ${stage}`,
      user: 'Usuario',
    };
    const prev = get().orders;
    const current = prev.find((o) => o.id === orderId);
    if (!current) return;
    const newLog = [...(current.activity_log || []), entry];
    set({
      orders: prev.map((o) =>
        o.id === orderId
          ? { ...o, production_stage: stage, activity_log: newLog }
          : o,
      ),
    });
    try {
      await persistMeta(orderId, { production_stage: stage, activity_log: newLog });
    } catch {
      set({ orders: prev });
    }
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

bulkChangeStatus: async (status) => {
    const { selectedOrders } = get();
    set({ selectedOrders: new Set() });
    for (const id of selectedOrders) {
      await get().updateOrder(id, { status });
    }
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

  addPhoto: async (orderId, url, name) => {
    const photo: OrderPhoto = {
      id: crypto.randomUUID(),
      url,
      name,
      timestamp: new Date().toISOString(),
    };
    const prev = get().orders;
    const current = prev.find((o) => o.id === orderId);
    if (!current) return;
    const newPhotos = [...(current.photos || []), photo];
    set({
      orders: prev.map((o) =>
        o.id === orderId ? { ...o, photos: newPhotos } : o,
      ),
    });
    try { await persistMeta(orderId, { photos: newPhotos }); } catch { set({ orders: prev }); }
  },
}));

useTenantStore.subscribe((state, prev) => {
  if (state.activeCompanyId !== prev.activeCompanyId) {
    useOrderStore.setState({ orders: [], selectedOrders: new Set<string>(), isLoading: false });
  }
});
