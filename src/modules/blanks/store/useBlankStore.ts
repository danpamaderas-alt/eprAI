import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import { useTenantStore } from '../../../store/useTenantStore';
import type { TextileBlank, TextileBlankInput } from '../types';

interface BlankState {
  blanks: TextileBlank[];
  isLoading: boolean;
  error: string | null;

  fetchBlanks: () => Promise<void>;
  addBlank: (data: TextileBlankInput) => Promise<TextileBlank>;
  updateBlank: (id: string, data: Partial<TextileBlankInput>) => Promise<TextileBlank>;
  adjustStock: (id: string, delta: number) => Promise<void>;
  deleteBlank: (id: string) => Promise<void>;
}

export const useBlankStore = create<BlankState>((set, get) => ({
  blanks: [],
  isLoading: false,
  error: null,

  fetchBlanks: async () => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) return;

    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('textile_blanks')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ blanks: (data as TextileBlank[]) ?? [], isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar los blanks';
      console.error('fetchBlanks error:', err);
      set({ isLoading: false, error: message });
    }
  },

  addBlank: async (data) => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) throw new Error('No hay compañía activa.');

    const { data: row, error } = await supabase
      .from('textile_blanks')
      .insert([{ ...data, company_id: companyId }])
      .select()
      .single();

    if (error) throw error;

    set((state) => ({
      blanks: [row as TextileBlank, ...state.blanks],
    }));

    return row as TextileBlank;
  },

  updateBlank: async (id, data) => {
    const { data: row, error } = await supabase
      .from('textile_blanks')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    set((state) => ({
      blanks: state.blanks.map((b) => (b.id === id ? (row as TextileBlank) : b)),
    }));

    return row as TextileBlank;
  },

  adjustStock: async (id, delta) => {
    // RPC atómica (lock de fila en SQL) con fallback a read-modify-write
    const { data, error } = await supabase.rpc('adjust_blank_stock', {
      p_blank_id: id,
      p_delta: delta,
    });
    if (!error && typeof data === 'number') {
      set((state) => ({
        blanks: state.blanks.map((b) => (b.id === id ? { ...b, stock_qty: data } : b)),
      }));
      return;
    }

    const current = get().blanks.find((b) => b.id === id);
    if (!current) throw new Error('Blank no encontrado.');

    const next = Math.max(0, current.stock_qty + delta);
    await get().updateBlank(id, { stock_qty: next });
  },

  deleteBlank: async (id) => {
    const { error } = await supabase.from('textile_blanks').delete().eq('id', id);
    if (error) throw error;

    set((state) => ({
      blanks: state.blanks.filter((b) => b.id !== id),
    }));
  },
}));

useTenantStore.subscribe((state, prev) => {
  if (state.activeCompanyId !== prev.activeCompanyId) {
    useBlankStore.setState({ blanks: [], isLoading: false, error: null });
  }
});
