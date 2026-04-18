import { create } from 'zustand';
import { supabase } from '../../../../lib/supabase';
import { useTenantStore } from '../../../../store/useTenantStore';

export interface Movement {
  id?: string;
  date: string;
  concept: string;
  category: string;
  account: 'EFECTIVO' | 'MERCADO_PAGO' | 'BANCO_NACION';
  type: 'IN' | 'OUT';
  amount: number;
  company_id?: string;
}

interface TreasuryState {
  addMovement: (movement: Omit<Movement, 'id' | 'company_id'>) => Promise<void>;
}

export const useTreasuryStore = create<TreasuryState>(() => ({
  addMovement: async (movement) => {
    const companyId = useTenantStore.getState().activeCompanyId;
    const { error } = await supabase.from('treasury').insert([
      { ...movement, company_id: companyId }
    ]);
    if (error) throw error;
  },
}));