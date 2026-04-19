import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';

export interface DebtMovement {
  id: string;
  customer_id: string;
  date: string;
  amount: number; // Positivo = Nueva Deuda (Fiado), Negativo = Pago (Abono)
  concept: string;
  type: 'CHARGE' | 'PAYMENT';
}

interface DebtState {
  movements: DebtMovement[];
  isLoading: boolean;
  fetchMovements: () => Promise<void>;
  addMovement: (movement: Omit<DebtMovement, 'id'>) => Promise<void>;
}

export const useDebtStore = create<DebtState>((set) => ({
  movements: [],
  isLoading: false,

  fetchMovements: async () => {
    set({ isLoading: true });
    // Asumimos que crearás una tabla llamada 'debt_movements' en Supabase
    const { data, error } = await supabase
      .from('debt_movements')
      .select('*')
      .order('date', { ascending: false });
      
    if (!error && data) {
      set({ movements: data as DebtMovement[], isLoading: false });
    } else {
      console.log("Aviso: No se pudo cargar debt_movements. ¿Ya creaste la tabla en Supabase?");
      set({ movements: [], isLoading: false });
    }
  },

  addMovement: async (movement) => {
    const { error } = await supabase.from('debt_movements').insert([movement]);
    if (error) throw error;
    useDebtStore.getState().fetchMovements(); // Recargar lista
  }
}));