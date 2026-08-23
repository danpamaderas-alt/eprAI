import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import { useTenantStore } from '../../../store/useTenantStore';
import { useFilamentStore } from '../../filaments/store/useFilamentStore';
import type { Json } from '../../../shared/types/database.types';
import type { PrintJob3D, PrintJob3DInput, PrintJob3DStatus, PrintJob3DUpdate } from '../types';

interface CompleteJobData {
  actual_weight_g: number;
  actual_time_h: number;
  actual_notes?: string;
}

interface PrintJobState {
  jobs: PrintJob3D[];
  isLoading: boolean;
  error: string | null;

  fetchJobs: () => Promise<void>;
  addJob: (data: PrintJob3DInput) => Promise<PrintJob3D>;
  updateJob: (id: string, data: PrintJob3DUpdate) => Promise<PrintJob3D>;
  setStatus: (id: string, status: PrintJob3DStatus) => Promise<void>;
  completeJob: (id: string, data: CompleteJobData) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
}

export const usePrintJobStore = create<PrintJobState>((set) => ({
  jobs: [],
  isLoading: false,
  error: null,

  fetchJobs: async () => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) return;

    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('print_jobs_3d')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      set({ jobs: (data as unknown as PrintJob3D[]) ?? [], isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar los trabajos';
      console.error('fetchJobs error:', err);
      set({ isLoading: false, error: message });
    }
  },

  addJob: async (data) => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) throw new Error('No hay compañía activa.');

    const { data: row, error } = await supabase
      .from('print_jobs_3d')
      .insert([
        {
          ...data,
          company_id: companyId,
          inputs: (data.inputs ?? {}) as Json,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    set((state) => ({
      jobs: [row as unknown as PrintJob3D, ...state.jobs],
    }));

    return row as unknown as PrintJob3D;
  },

  updateJob: async (id, data) => {
    const { inputs, ...rest } = data;
    const payload: Omit<PrintJob3DUpdate, 'inputs'> & { inputs?: Json } = { ...rest };
    if (inputs !== undefined) payload.inputs = inputs as Json;

    const { data: row, error } = await supabase
      .from('print_jobs_3d')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    set((state) => ({
      jobs: state.jobs.map((j) => (j.id === id ? (row as unknown as PrintJob3D) : j)),
    }));

    return row as unknown as PrintJob3D;
  },

  setStatus: async (id, status) => {
    await usePrintJobStore.getState().updateJob(id, { status });
  },

  completeJob: async (id, data) => {
    const job = usePrintJobStore.getState().jobs.find((j) => j.id === id);
    if (!job) throw new Error('Trabajo no encontrado.');

    const alreadyCompleted = job.status === 'completado' || job.status === 'entregado';

    await usePrintJobStore.getState().updateJob(id, {
      status: 'completado',
      actual_weight_g: data.actual_weight_g,
      actual_time_h: data.actual_time_h,
      actual_notes: data.actual_notes ?? null,
    });

    // Descuenta el consumo real del rollo una sola vez
    if (!alreadyCompleted && job.filament_id && data.actual_weight_g > 0) {
      try {
        await useFilamentStore.getState().consumeGrams(job.filament_id, data.actual_weight_g);
      } catch (err) {
        console.error('consumeGrams error (trabajo igual completado):', err);
      }
    }
  },

  deleteJob: async (id) => {
    const { error } = await supabase.from('print_jobs_3d').delete().eq('id', id);
    if (error) throw error;

    set((state) => ({
      jobs: state.jobs.filter((j) => j.id !== id),
    }));
  },
}));

useTenantStore.subscribe((state, prev) => {
  if (state.activeCompanyId !== prev.activeCompanyId) {
    usePrintJobStore.setState({ jobs: [], isLoading: false, error: null });
  }
});
