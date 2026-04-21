import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';

export interface DebtMovement {
  id: string;
  customer_id: string;
  amount: number;
  type: 'CARGO' | 'PAGO';
  concept: string;
  created_at: string;
}

export interface CustomerDebt {
  id: string;
  name: string;
  total_debt: number;
  last_payment_date: string | null;
  phone?: string;
}

interface DebtState {
  debtors: CustomerDebt[];
  isLoading: boolean;
  fetchDebtors: () => Promise<void>;
  registerPayment: (customerId: string, amount: number) => Promise<void>;
}

export const useDebtStore = create<DebtState>((set, get) => ({
  debtors: [],
  isLoading: false,

  fetchDebtors: async () => {
    set({ isLoading: true });
    
    // Tabla correcta: client_movements
    const { data, error } = await supabase
      .from('customers')
      .select(`
        id, 
        name, 
        phone,
        client_movements (amount, type, created_at)
      `);

    if (error) {
      console.error("❌ Error cargando deudas:", error.message);
      set({ isLoading: false });
      return;
    }

    const processed: CustomerDebt[] = (data || []).map((c: any) => {
      const movements = c.client_movements || [];
      const total = movements.reduce((acc: number, m: any) => {
        return m.type === 'CARGO' ? acc + m.amount : acc - m.amount;
      }, 0);

      const lastPayment = movements
        .filter((m: any) => m.type === 'PAGO')
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

      return {
        id: c.id,
        name: c.name,
        total_debt: total,
        last_payment_date: lastPayment ? lastPayment.created_at : null,
        phone: c.phone
      };
    });

    set({ debtors: processed, isLoading: false });
  },

  registerPayment: async (customerId, amount) => {
    const { error: moveError } = await supabase
      .from('client_movements')
      .insert([{ 
        customer_id: customerId, 
        amount: amount, 
        type: 'PAGO', 
        concept: 'Entrega de efectivo / Pago Cta Cte' 
      }]);

    if (moveError) {
        console.error("❌ Error guardando pago:", moveError.message);
        throw moveError;
    }
    await get().fetchDebtors();
  }
}));