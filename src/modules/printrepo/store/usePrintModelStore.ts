import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import { useTenantStore } from '../../../store/useTenantStore';
import type { PrintModel, PrintModelInput } from '../types';

export const PRINT_STATUSES = [
  'Idea',
  'En Cola',
  'Imprimiendo',
  'Completado',
  'Descartado',
] as const;

export type PrintStatus = (typeof PRINT_STATUSES)[number];

interface PrintModelState {
  models: PrintModel[];
  isLoading: boolean;
  error: string | null;

  fetchModels: () => Promise<void>;
  addModel: (data: PrintModelInput) => Promise<PrintModel>;
  updateModel: (id: string, data: Partial<PrintModelInput>) => Promise<PrintModel>;
  setStatus: (id: string, status: PrintStatus) => Promise<void>;
  deleteModel: (id: string) => Promise<void>;
}

export const usePrintModelStore = create<PrintModelState>((set, get) => ({
  models: [],
  isLoading: false,
  error: null,

  fetchModels: async () => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) return;

    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('print_models')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ models: (data as PrintModel[]) ?? [], isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar los modelos 3D';
      console.error('fetchModels error:', err);
      set({ isLoading: false, error: message });
    }
  },

  addModel: async (data) => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) throw new Error('No hay compañía activa.');

    const { data: row, error } = await supabase
      .from('print_models')
      .insert([{ ...data, company_id: companyId }])
      .select()
      .single();

    if (error) throw error;

    set((state) => ({
      models: [row as PrintModel, ...state.models],
    }));

    return row as PrintModel;
  },

  updateModel: async (id, data) => {
    const { data: row, error } = await supabase
      .from('print_models')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    set((state) => ({
      models: state.models.map((m) => (m.id === id ? (row as PrintModel) : m)),
    }));

    return row as PrintModel;
  },

  setStatus: async (id, status) => {
    await get().updateModel(id, { status });
  },

  deleteModel: async (id) => {
    const { error } = await supabase.from('print_models').delete().eq('id', id);
    if (error) throw error;

    set((state) => ({
      models: state.models.filter((m) => m.id !== id),
    }));
  },
}));

useTenantStore.subscribe((state, prev) => {
  if (state.activeCompanyId !== prev.activeCompanyId) {
    usePrintModelStore.setState({ models: [], isLoading: false, error: null });
  }
});