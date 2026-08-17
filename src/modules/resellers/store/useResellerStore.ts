import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import { useTenantStore } from '../../../store/useTenantStore';
import Swal from 'sweetalert2';

export interface Reseller {
  id: string;
  name: string;
  phone: string;
  created_at: string;
}

export interface ResellerTransaction {
  id: string;
  resellerId: string;
  type: 'GOODS_GIVEN' | 'PAYMENT';
  description: string;
  amount: number;
  date: string;
}

interface ResellerState {
  resellers: Reseller[];
  transactions: ResellerTransaction[];
  isLoading: boolean;
  fetchData: () => Promise<void>;
  addReseller: (name: string, phone: string) => Promise<void>;
  addTransaction: (data: Omit<ResellerTransaction, 'id' | 'date'>) => Promise<void>;
}

export const useResellerStore = create<ResellerState>((set) => ({
  resellers: [],
  transactions: [],
  isLoading: false,

  fetchData: async () => {
    set({ isLoading: true });
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) { set({ isLoading: false }); return; }

    const [resData, txData] = await Promise.all([
      supabase.from('resellers').select('id, name, phone, created_at').eq('company_id', companyId).order('name', { ascending: true }),
      supabase.from('reseller_transactions').select('id, resellerId, type, description, amount, date').order('date', { ascending: false })
    ]);

    set({ 
      resellers: resData.data || [], 
      transactions: txData.data || [], 
      isLoading: false 
    });
  },

  addReseller: async (name, phone) => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) throw new Error('No hay company_id activo');

    const newReseller: Reseller = { id: crypto.randomUUID(), name, phone, created_at: new Date().toISOString() };
    const { error } = await supabase.from('resellers').insert([{ ...newReseller, company_id: companyId }]);
    if (!error) {
      set((state) => ({ resellers: [...state.resellers, newReseller] }));
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Revendedor creado', showConfirmButton: false, timer: 1500 });
    }
  },

  addTransaction: async (data) => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) throw new Error('No hay company_id activo');

    const newTx: ResellerTransaction = { id: crypto.randomUUID(), ...data, date: new Date().toISOString() };
    const { error } = await supabase.from('reseller_transactions').insert([{ ...newTx, company_id: companyId }]);
    if (!error) {
      set((state) => ({ transactions: [newTx, ...state.transactions] }));
    } else {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo registrar el movimiento.' });
      throw new Error('Database error');
    }
  }
}));