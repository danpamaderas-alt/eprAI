import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';

// --- INTERFACES SEGURAS ---
export interface FinancialTransaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  category: string;
  date: string;
  status: 'PENDIENTE' | 'COMPLETADO' | 'CANCELADO';
}

export interface FinanceMetrics {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  pendingPayables: number;    // Lo que le debes a Proveedores
  pendingReceivables: number; // Lo que te deben los Clientes (Pedidos - Señas)
}

interface FinanceState {
  metrics: FinanceMetrics;
  transactions: FinancialTransaction[];
  isLoading: boolean;
  fetchFinancialData: () => Promise<void>;
}

export const useFinanceStore = create<FinanceState>((set) => ({
  metrics: {
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    pendingPayables: 0,
    pendingReceivables: 0
  },
  transactions: [],
  isLoading: false,

  fetchFinancialData: async () => {
    set({ isLoading: true });
    try {
      // VANGUARDIA (Rendimiento): Llamamos a múltiples tablas en paralelo
      // para no bloquear la interfaz y hacer que el dashboard sea "relámpago".
      const [treasuryRes, ordersRes] = await Promise.all([
        supabase.from('treasury').select('*'),
        supabase.from('orders').select('total_amount, advance_payment, status')
      ]);

      if (treasuryRes.error) throw treasuryRes.error;
      if (ordersRes.error) throw ordersRes.error;

      // Procesamos los ingresos y egresos de la tesorería
      let income = 0;
      let expenses = 0;
      
      (treasuryRes.data || []).forEach((tx) => {
        if (tx.status === 'COMPLETADO') {
          if (tx.type === 'INCOME') income += Number(tx.amount || 0);
          if (tx.type === 'EXPENSE') expenses += Number(tx.amount || 0);
        }
      });

      // Calculamos el dinero que está "en la calle" (Cuentas por cobrar de pedidos en curso)
      let pendingReceivables = 0;
      (ordersRes.data || []).forEach((order) => {
         if (order.status !== 'CANCELLED' && order.status !== 'DELIVERED') {
             const total = Number(order.total_amount || 0);
             const advance = Number(order.advance_payment || 0);
             if (total > advance) pendingReceivables += (total - advance);
         }
      });

      set({
        transactions: treasuryRes.data as FinancialTransaction[],
        metrics: {
          totalIncome: income,
          totalExpenses: expenses,
          balance: income - expenses,
          pendingPayables: 0, // TODO: Conectar en el futuro con la tabla de proveedores
          pendingReceivables
        },
        isLoading: false
      });
    } catch (error) {
      console.error('❌ Error cargando datos financieros:', error);
      set({ isLoading: false });
    }
  }
}));