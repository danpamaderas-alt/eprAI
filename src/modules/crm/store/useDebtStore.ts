import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';

// 🛡️ INTERFACES ESTRICTAS
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
  balance: number; // Unificamos con el término 'balance' de la DB
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
    
    try {
      // 🚀 OPTIMIZACIÓN: Columnas explícitas
      const { data: customersData, error: custError } = await supabase
        .from('customers')
        .select('id, name, phone, balance')
        .order('name');

      if (custError) throw custError;

      const { data: movementsData, error: movError } = await supabase
        .from('client_movements')
        .select('id, customer_id, amount, type, concept, created_at')
        .order('created_at', { ascending: false });

      if (movError) throw movError;

      // 🧠 PROCESAMIENTO: Mapeo de deudores con sus movimientos
      const processed: CustomerDebt[] = (customersData || []).map(customer => {
        const customerMovements = (movementsData || []).filter(
          (m: DebtMovement) => m.customer_id === customer.id
        );
        
        const lastPayment = customerMovements
          .filter(m => m.type === 'PAGO')
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

        return {
          id: customer.id,
          name: customer.name,
          balance: Number(customer.balance) || 0,
          phone: customer.phone,
          last_payment_date: lastPayment ? lastPayment.created_at : null,
          movements: customerMovements
        };
      });

      set({ debtors: processed });
    } catch (error: unknown) {
      console.error("❌ [DebtStore] Error en fetchDebtors:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  registerPayment: async (customerId, amount) => {
    try {
      const { error } = await supabase
        .from('client_movements')
        .insert([{ 
          customer_id: customerId, 
          amount: Math.abs(amount), // Aseguramos positivo
          type: 'PAGO', 
          concept: 'Entrega de efectivo / Pago Cta Cte' 
        }]);

      if (error) throw error;
      await get().fetchDebtors();
    } catch (error: unknown) {
      console.error("❌ [DebtStore] Error en registerPayment:", error);
      throw error;
    }
  },

  addDebt: async (customerId, amount, concept) => {
    try {
      const { error } = await supabase
        .from('client_movements')
        .insert([{ 
          customer_id: customerId, 
          amount: Math.abs(amount), 
          type: 'CARGO', 
          concept: concept || 'Cargo a Cuenta Corriente' 
        }]);

      if (error) throw error;
      await get().fetchDebtors();
    } catch (error: unknown) {
      console.error("❌ [DebtStore] Error en addDebt:", error);
      throw error;
    }
  },

  deleteMovement: async (movementId) => {
    try {
      const { error } = await supabase
        .from('client_movements')
        .delete()
        .eq('id', movementId);
        
      if (error) throw error;
      await get().fetchDebtors();
    } catch (error: unknown) {
      console.error("❌ [DebtStore] Error en deleteMovement:", error);
      throw error;
    }
  },

  editMovement: async (movementId, amount, concept) => {
    try {
      const { error } = await supabase
        .from('client_movements')
        .update({ amount: Math.abs(amount), concept })
        .eq('id', movementId);
        
      if (error) throw error;
      await get().fetchDebtors();
    } catch (error: unknown) {
      console.error("❌ [DebtStore] Error en editMovement:", error);
      throw error;
    }
  },
}));