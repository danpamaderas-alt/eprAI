import { create } from 'zustand';
import { supabase } from '../lib/supabase'; // Ajusta la ruta según tu proyecto

// 1. Definimos qué datos maneja la Tesorería
interface Transaction {
  id: string;
  createdAt: string;
  date: string;
  amount: number;
  description: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  category: string;
  businessUnit: string;
  paymentMethod: string;
  status: string;
}

interface TreasuryState {
  transactions: Transaction[];
  isLoading: boolean;
  fetchTransactions: () => Promise<void>;
  addTransaction: (formData: any) => Promise<{ success: boolean }>;
}

// 2. Creamos el Store (El cerebro)
export const useTreasuryStore = create<TreasuryState>((set) => ({
  transactions: [],
  isLoading: false,

  // Función para LEER los movimientos
  fetchTransactions: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('createdAt', { ascending: false }); // Coincide con nuestro SQL

      if (error) throw error;
      set({ transactions: data || [], isLoading: false });
    } catch (error) {
      console.error('[Treasury Store] Error al cargar:', error);
      set({ isLoading: false });
    }
  },

  // FUNCIÓN CRÍTICA: La que "Graba" el movimiento
  addTransaction: async (formData) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          // Forzamos los nombres exactos que pusimos en el SQL Editor
          amount: Number(formData.amount),
          description: formData.description,
          type: formData.type,
          category: formData.category,
          date: formData.date || new Date().toISOString(),
          businessUnit: formData.businessUnit,   // La "U" mayúscula es clave
          paymentMethod: formData.paymentMethod, // La "M" mayúscula es clave
          status: 'COMPLETED'
        }])
        .select()
        .single();

      if (error) throw error;

      // Actualizamos la lista en pantalla sin recargar la página
      set((state) => ({ 
        transactions: [data, ...state.transactions] 
      }));

      return { success: true };
    } catch (error) {
      console.error("Error al grabar en la base de datos:", error);
      throw error;
    }
  }
}));