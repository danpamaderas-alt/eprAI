import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
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
    const [resData, txData] = await Promise.all([
      supabase.from('resellers').select('*').order('name', { ascending: true }),
      supabase.from('reseller_transactions').select('*').order('date', { ascending: false })
    ]);

    set({ 
      resellers: resData.data || [], 
      transactions: txData.data || [], 
      isLoading: false 
    });
  },

  addReseller: async (name, phone) => {
    const newReseller: Reseller = { id: crypto.randomUUID(), name, phone, created_at: new Date().toISOString() };
    const { error } = await supabase.from('resellers').insert([newReseller]);
    if (!error) {
      set((state) => ({ resellers: [...state.resellers, newReseller] }));
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Revendedor creado', showConfirmButton: false, timer: 1500 });
    }
  },

  addTransaction: async (data) => {
    const newTx: ResellerTransaction = { id: crypto.randomUUID(), ...data, date: new Date().toISOString() };
    const { error } = await supabase.from('reseller_transactions').insert([newTx]);
    if (!error) {
      set((state) => ({ transactions: [newTx, ...state.transactions] }));
    } else {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo registrar el movimiento.' });
      throw new Error('Database error');
    }
  }
}));