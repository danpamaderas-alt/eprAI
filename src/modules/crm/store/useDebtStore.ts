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
  movements: DebtMovement[]; 
}

interface DebtState {
  debtors: CustomerDebt[];
  isLoading: boolean;
  fetchDebtors: () => Promise<void>;
  registerPayment: (customerId: string, amount: number) => Promise<void>;
  addDebt: (customerId: string, amount: number, concept: string) => Promise<void>;
  deleteMovement: (movementId: string) => Promise<void>;
  editMovement: (movementId: string, amount: number, concept: string) => Promise<void>;
}

export const useDebtStore = create<DebtState>((set, get) => ({
  debtors: [],
  isLoading: false,

  fetchDebtors: async () => {
    set({ isLoading: true });
    
    const { data, error } = await supabase
      .from('customers')
      .select(`
        id, 
        name, 
        phone,
        client_movements (id, amount, type, concept, created_at)
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
        phone: c.phone,
        movements: movements.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
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

    if (moveError) throw moveError;
    await get().fetchDebtors();
  },

  addDebt: async (customerId, amount, concept) => {
    // 🔍 ARMAMOS EL PAQUETE Y LO MOSTRAMOS EN CONSOLA
    const payload = { 
      customer_id: customerId, 
      amount: amount, 
      type: 'CARGO', 
      concept: concept || 'Cargo a Cuenta Corriente' 
    };
    
    console.log("📤 Intentando guardar Cargo. Datos enviados:", payload);

    const { error: moveError } = await supabase
      .from('client_movements')
      .insert([payload]);

    if (moveError) {
      console.error("❌ Error CRUDO de Supabase:", moveError);
      throw moveError;
    }
    
    await get().fetchDebtors();
  },

  deleteMovement: async (movementId) => {
    const { error } = await supabase.from('client_movements').delete().eq('id', movementId);
    if (error) throw error;
    await get().fetchDebtors(); 
  },

  editMovement: async (movementId, amount, concept) => {
    const { error } = await supabase.from('client_movements').update({ amount: amount, concept: concept }).eq('id', movementId);
    if (error) throw error;
    await get().fetchDebtors(); 
  }
}));