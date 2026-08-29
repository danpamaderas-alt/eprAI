import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import { useTenantStore } from '../../../store/useTenantStore';
import type { PrintFilament, PrintFilamentInput } from '../types';

interface FilamentState {
  filaments: PrintFilament[];
  isLoading: boolean;
  error: string | null;

  fetchFilaments: () => Promise<void>;
  addFilament: (data: PrintFilamentInput) => Promise<PrintFilament>;
  updateFilament: (id: string, data: Partial<PrintFilamentInput>) => Promise<PrintFilament>;
  consumeGrams: (id: string, grams: number) => Promise<void>;
  deleteFilament: (id: string) => Promise<void>;
}

export const useFilamentStore = create<FilamentState>((set, get) => ({
  filaments: [],
  isLoading: false,
  error: null,

  fetchFilaments: async () => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) return;

    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('print_filaments')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ filaments: (data as PrintFilament[]) ?? [], isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar los filamentos';
      console.error('fetchFilaments error:', err);
      set({ isLoading: false, error: message });
    }
  },

  addFilament: async (data) => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) throw new Error('No hay compañía activa.');

    const { data: row, error } = await supabase
      .from('print_filaments')
      .insert([{ ...data, company_id: companyId }])
      .select()
      .single();

    if (error) throw error;

    set((state) => ({
      filaments: [row as PrintFilament, ...state.filaments],
    }));

    return row as PrintFilament;
  },

  updateFilament: async (id, data) => {
    const { data: row, error } = await supabase
      .from('print_filaments')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    set((state) => ({
      filaments: state.filaments.map((f) => (f.id === id ? (row as PrintFilament) : f)),
    }));

    return row as PrintFilament;
  },

  consumeGrams: async (id, grams) => {
    // RPC atómica (lock de fila en SQL) con fallback a read-modify-write
    const { data, error } = await supabase.rpc('consume_filament_grams', {
      p_filament_id: id,
      p_grams: grams,
    });
    if (!error && typeof data === 'number') {
      set((state) => ({
        filaments: state.filaments.map((f) => (f.id === id ? { ...f, remaining_g: data } : f)),
      }));
      return;
    }

    const current = get().filaments.find((f) => f.id === id);
    if (!current) throw new Error('Filamento no encontrado.');

    const next = Math.max(0, current.remaining_g - grams);
    await get().updateFilament(id, { remaining_g: next });
  },

  deleteFilament: async (id) => {
    const { error } = await supabase.from('print_filaments').delete().eq('id', id);
    if (error) throw error;

    set((state) => ({
      filaments: state.filaments.filter((f) => f.id !== id),
    }));
  },
}));

useTenantStore.subscribe((state, prev) => {
  if (state.activeCompanyId !== prev.activeCompanyId) {
    useFilamentStore.setState({ filaments: [], isLoading: false, error: null });
  }
});
