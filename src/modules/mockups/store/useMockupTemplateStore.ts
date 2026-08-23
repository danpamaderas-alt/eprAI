import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import { useTenantStore } from '../../../store/useTenantStore';
import type { MockupTemplate, MockupTemplateInput } from '../types';

interface MockupTemplateState {
  templates: MockupTemplate[];
  isLoading: boolean;
  error: string | null;

  fetchTemplates: () => Promise<void>;
  addTemplate: (data: MockupTemplateInput) => Promise<MockupTemplate>;
  updateTemplate: (id: string, data: Partial<MockupTemplateInput>) => Promise<MockupTemplate>;
  deleteTemplate: (id: string) => Promise<void>;
}

export const useMockupTemplateStore = create<MockupTemplateState>((set) => ({
  templates: [],
  isLoading: false,
  error: null,

  fetchTemplates: async () => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) return;

    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('mockup_templates')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ templates: (data as MockupTemplate[]) ?? [], isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar las plantillas';
      console.error('fetchTemplates error:', err);
      set({ isLoading: false, error: message });
    }
  },

  addTemplate: async (data) => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) throw new Error('No hay compañía activa.');

    const { data: row, error } = await supabase
      .from('mockup_templates')
      .insert([{ ...data, company_id: companyId }])
      .select()
      .single();

    if (error) throw error;

    set((state) => ({
      templates: [row as MockupTemplate, ...state.templates],
    }));

    return row as MockupTemplate;
  },

  updateTemplate: async (id, data) => {
    const { data: row, error } = await supabase
      .from('mockup_templates')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    set((state) => ({
      templates: state.templates.map((t) => (t.id === id ? (row as MockupTemplate) : t)),
    }));

    return row as MockupTemplate;
  },

  deleteTemplate: async (id) => {
    const { error } = await supabase.from('mockup_templates').delete().eq('id', id);
    if (error) throw error;

    set((state) => ({
      templates: state.templates.filter((t) => t.id !== id),
    }));
  },
}));

useTenantStore.subscribe((state, prev) => {
  if (state.activeCompanyId !== prev.activeCompanyId) {
    useMockupTemplateStore.setState({ templates: [], isLoading: false, error: null });
  }
});
