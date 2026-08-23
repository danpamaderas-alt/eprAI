import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import { useTenantStore } from '../../../store/useTenantStore';

type FireArgs =
  | [options?: import('sweetalert2').SweetAlertOptions]
  | [title: string, html?: string, icon?: import('sweetalert2').SweetAlertIcon];

const Swal = {
  fire: async (...args: FireArgs) => {
    const m = (await import('sweetalert2')).default as unknown as { fire: (...a: FireArgs) => Promise<unknown> };
    return m.fire(...args);
  },
};

import type { Database } from '../../../shared/types/database.types';
type ResellerInsert = Database['public']['Tables']['resellers']['Insert'];
type ResellerTxInsert = Database['public']['Tables']['reseller_transactions']['Insert'];

export interface Reseller {
  id: string;
  name: string;
  phone: string;
  created_at: string;
}

export interface ResellerTransaction {
  id: string;
  reseller_id: string;
  type: 'GOODS_GIVEN' | 'PAYMENT';
  description: string;
  amount: number;
  created_at: string;
}

interface ResellerState {
  resellers: Reseller[];
  transactions: ResellerTransaction[];
  isLoading: boolean;
  fetchData: () => Promise<void>;
  addReseller: (name: string, phone: string) => Promise<void>;
  addTransaction: (data: Omit<ResellerTransaction, 'id' | 'created_at'>) => Promise<void>;
}

export const useResellerStore = create<ResellerState>((set) => ({
  resellers: [],
  transactions: [],
  isLoading: false,

  fetchData: async () => {
    set({ isLoading: true });
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) { set({ isLoading: false }); return; }

    const resResult = await supabase.from('resellers').select('id, name, phone, created_at').eq('company_id', companyId).order('name', { ascending: true });

    if (resResult.error) {
      console.error("Error fetching resellers:", resResult.error);
      set({ isLoading: false });
      return;
    }

    const resellers = resResult.data || [];
    const resellerIds = resellers.map(r => r.id);
    const txResult = resellerIds.length > 0
      ? await supabase.from('reseller_transactions').select('id, reseller_id, type, description, amount, created_at').in('reseller_id', resellerIds).order('created_at', { ascending: false })
      : { data: [], error: null };

    if (txResult.error) {
      console.error("Error fetching reseller transactions:", txResult.error);
    }

    set({
      resellers: (resResult.data || []) as unknown as Reseller[],
      transactions: (txResult.data || []) as unknown as ResellerTransaction[],
      isLoading: false
    });
  },

  addReseller: async (name, phone) => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) throw new Error('No hay company_id activo');

    const newReseller: Reseller = { id: crypto.randomUUID(), name, phone, created_at: new Date().toISOString() };
    const { data, error } = await supabase.from('resellers').insert([{ ...newReseller, company_id: companyId } as ResellerInsert]).select();
    if (error) {
      console.error("Error creating reseller:", error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo crear el revendedor.' });
      throw error;
    }
    const saved = ((data && data[0]) || newReseller) as Reseller;
    set((state) => ({ resellers: [...state.resellers, saved] }));
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Revendedor creado', showConfirmButton: false, timer: 1500 });
  },

  addTransaction: async (data) => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) throw new Error('No hay company_id activo');
    const { data: inserted, error } = await supabase.from('reseller_transactions').insert([{ ...data, company_id: companyId } as ResellerTxInsert]).select();
    if (error) {
      console.error("Error registering movement:", error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo registrar el movimiento.' });
      throw error;
    }
    const saved = ((inserted && inserted[0]) || { ...data, id: crypto.randomUUID(), created_at: new Date().toISOString() }) as ResellerTransaction;
    set((state) => ({ transactions: [saved, ...state.transactions] }));
  }
}));