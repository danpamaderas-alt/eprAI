import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';

export interface Debt {
  id: string;
  customer_id: string;
  total_amount: number;
  remaining_balance: number;
  description: string;
  status: 'PENDING' | 'PARTIAL' | 'PAID';
  created_at: string;
  customers?: { name: string; company?: string }; // Traemos los datos del cliente
}

interface DebtStore {
  debts: Debt[];
  isLoading: boolean;
  fetchDebts: () => Promise<void>;
  createDebt: (data: Partial<Debt>) => Promise<void>;
  addPayment: (debtId: string, amount: number, method: string, businessUnit: string, customerName: string) => Promise<void>;
}

export const useDebtStore = create<DebtStore>((set, get) => ({
  debts: [],
  isLoading: false,

  fetchDebts: async () => {
    set({ isLoading: true });
    try {
      // Pedimos las deudas y, de paso, le pedimos a Supabase que nos traiga el nombre del cliente asociado
      const { data, error } = await supabase
        .from('customer_debts')
        .select('*, customers(name, company)')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      set({ debts: data as Debt[] });
    } catch (error) {
      console.error(error);
    } finally {
      set({ isLoading: false });
    }
  },

  createDebt: async (data) => {
    const { error } = await supabase.from('customer_debts').insert([data]);
    if (error) throw error;
    get().fetchDebts();
  },

  // ✅ LA FUNCIÓN ESTRELLA: Cobra, descuenta y manda a tesorería
  addPayment: async (debtId: string, amount: number, method: string, businessUnit: string, customerName: string) => {
    const debt = get().debts.find(d => d.id === debtId);
    if (!debt) throw new Error("Deuda no encontrada");

    const newBalance = debt.remaining_balance - amount;
    const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIAL';

    // 1. Guardar el ticket del pago parcial
    await supabase.from('debt_payments').insert([{ debt_id: debtId, amount, payment_method: method }]);

    // 2. Actualizar el saldo restante en la cuenta del cliente
    await supabase.from('customer_debts')
      .update({ remaining_balance: newBalance, status: newStatus })
      .eq('id', debtId);

    // 3. ¡EL GOLAZO! Mandar la plata a la Tesorería automáticamente
    await supabase.from('transactions').insert([{
      amount: amount,
      description: `Pago a cuenta - ${customerName}`,
      type: 'INCOME',
      category: 'COBRO_CUENTA_CORRIENTE',
      businessUnit: businessUnit,
      paymentMethod: method,
      date: new Date().toISOString()
    }]);

    // Refrescamos la pantalla
    get().fetchDebts();
  }
}));