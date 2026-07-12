import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../shared/types/database.types';
import { useTenantStore } from '../../../store/useTenantStore';

type CustomerInsert = Database['public']['Tables']['customers']['Insert'];
type CustomerUpdate = Database['public']['Tables']['customers']['Update'];
type MovementInsert = Database['public']['Tables']['account_movements']['Insert'];

export interface CustomerBalance {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  email: string | null;
  cuit: string | null;
  notes: string | null;
  balance: number | null;
  created_at: string | null;
  company_id?: string | null;
  loyalty_points: number | null;
  type: string;
}

interface CrmState {
  balances: CustomerBalance[];
  isLoading: boolean;
  fetchBalances: (searchTerm?: string) => Promise<void>;
  addCustomer: (customerData: Omit<CustomerInsert, 'company_id'>) => Promise<boolean>;
  updateCustomer: (id: string, data: CustomerUpdate) => Promise<boolean>;
  deleteCustomer: (id: string) => Promise<boolean>;
  addMovement: (movement: MovementInsert) => Promise<boolean>;
  awardLoyaltyPoints: (customerId: string, points: number, reason: string, orderId?: string) => Promise<void>;
  redeemLoyaltyPoints: (customerId: string, points: number, reason: string) => Promise<void>;
}

export const useCrmStore = create<CrmState>((set, get) => ({
  balances: [],
  isLoading: false,

  fetchBalances: async (searchTerm = '') => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) {
      console.warn('[CRM Store] fetchBalances abortado: Sin company_id');
      return;
    }

    set({ isLoading: true });
    try {
      let query = supabase
        .from('customers')
        .select('id, name, phone, address, email, cuit, notes, balance, created_at, company_id, loyalty_points, type')
        .eq('company_id', companyId);

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      const { data, error } = await query.order('balance', { ascending: false });
      
      if (error) throw error;
      set({ balances: (data as CustomerBalance[]) || [] });
    } catch (error) {
      console.error('[CRM Store] Error al obtener clientes:', error);
      set({ balances: [] });
    } finally { 
      set({ isLoading: false }); 
    }
  },

  addCustomer: async (customerData) => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) throw new Error('Operación rechazada: Falta ID de Compañía Activa.');

    try {
      const payload: CustomerInsert = { 
        ...customerData, 
        company_id: companyId 
      };

      const { error } = await supabase.from('customers').insert([payload]);
      
      if (error) {
        console.error('[CRM Store] Supabase Error insertando cliente:', error);
        throw new Error(error.message);
      }
      
      await get().fetchBalances(); 
      return true;
    } catch (error) { 
      console.error('[CRM Store] Falla general insertando cliente:', error);
      throw error;
    }
  },

  updateCustomer: async (id, data) => {
    try {
      const { error } = await supabase.from('customers').update(data).eq('id', id);
      if (error) {
        console.error('[CRM Store] Error actualizando cliente:', error);
        throw new Error(error.message);
      }
      await get().fetchBalances();
      return true;
    } catch (error) {
      console.error('[CRM Store] Falla general actualizando cliente:', error);
      throw error;
    }
  },

  deleteCustomer: async (id) => {
    try {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) {
        console.error('[CRM Store] Error eliminando cliente:', error);
        throw new Error(error.message);
      }
      set((state) => ({
        balances: state.balances.filter((c) => c.id !== id),
      }));
      return true;
    } catch (error) {
      console.error('[CRM Store] Falla general eliminando cliente:', error);
      throw error;
    }
  },

  addMovement: async (movement) => {
    try {
      const companyId = useTenantStore.getState().activeCompanyId;
      if (!companyId) throw new Error('No hay company_id activo');

      const { error } = await supabase.from('account_movements').insert([{ ...movement, company_id: companyId }]);
      
      if (error) {
        console.error('[CRM Store] Supabase Error insertando movimiento:', error);
        throw new Error(error.message);
      }

      await get().fetchBalances();
      return true;
    } catch (error) { 
      console.error('[CRM Store] Falla general en movimiento financiero:', error);
      throw error;
    }
  },

  awardLoyaltyPoints: async (customerId: string, points: number, reason: string, orderId?: string) => {
    const { error } = await supabase.rpc('award_loyalty_points', {
      p_customer_id: customerId,
      p_points: points,
      p_reason: reason,
      p_order_id: orderId ?? null,
    });
    if (error) {
      console.error('[CRM Store] Error otorgando puntos:', error.message);
      throw new Error(error.message);
    }
    await get().fetchBalances();
  },

  redeemLoyaltyPoints: async (customerId: string, points: number, reason: string) => {
    const { error } = await supabase.rpc('redeem_loyalty_points', {
      p_customer_id: customerId,
      p_points: points,
      p_reason: reason,
    });
    if (error) {
      console.error('[CRM Store] Error canjeando puntos:', error.message);
      throw new Error(error.message);
    }
    await get().fetchBalances();
  },
}));
