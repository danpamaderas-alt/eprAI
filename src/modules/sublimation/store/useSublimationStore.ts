import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import { useTenantStore } from '../../../store/useTenantStore';
import type { SublimationDesign, SublimationDesignInput } from '../types';

export const SUBLIMATION_STATUSES = [
  'Nuevo',
  'Descargado',
  'En Preparación',
  'Listo para Imprimir',
  'Usado',
  'Archivado',
] as const;

export type SublimationStatus = (typeof SUBLIMATION_STATUSES)[number];

interface SublimationDesignState {
  designs: SublimationDesign[];
  isLoading: boolean;
  error: string | null;

  fetchDesigns: () => Promise<void>;
  addDesign: (data: SublimationDesignInput) => Promise<SublimationDesign>;
  updateDesign: (id: string, data: Partial<SublimationDesignInput>) => Promise<SublimationDesign>;
  setStatus: (id: string, status: SublimationStatus) => Promise<void>;
  deleteDesign: (id: string) => Promise<void>;
}

export const useSublimationStore = create<SublimationDesignState>((set, get) => ({
  designs: [],
  isLoading: false,
  error: null,

  fetchDesigns: async () => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) return;

    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('sublimation_designs')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ designs: (data as SublimationDesign[]) ?? [], isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar los diseños de sublimación';
      console.error('fetchDesigns error:', err);
      set({ isLoading: false, error: message });
    }
  },

  addDesign: async (data) => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) throw new Error('No hay compañía activa.');

    const { data: row, error } = await supabase
      .from('sublimation_designs')
      .insert([{ ...data, company_id: companyId }])
      .select()
      .single();

    if (error) throw error;

    set((state) => ({
      designs: [row as SublimationDesign, ...state.designs],
    }));

    return row as SublimationDesign;
  },

  updateDesign: async (id, data) => {
    const { data: row, error } = await supabase
      .from('sublimation_designs')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    set((state) => ({
      designs: state.designs.map((d) => (d.id === id ? (row as SublimationDesign) : d)),
    }));

    return row as SublimationDesign;
  },

  setStatus: async (id, status) => {
    await get().updateDesign(id, { status });
  },

  deleteDesign: async (id) => {
    const { error } = await supabase.from('sublimation_designs').delete().eq('id', id);
    if (error) throw error;

    set((state) => ({
      designs: state.designs.filter((d) => d.id !== id),
    }));
  },
}));

useTenantStore.subscribe((state, prev) => {
  if (state.activeCompanyId !== prev.activeCompanyId) {
    useSublimationStore.setState({ designs: [], isLoading: false, error: null });
  }
});