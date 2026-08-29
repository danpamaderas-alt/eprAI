import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import { useTenantStore } from '../../../store/useTenantStore';
import type { Json } from '../../../shared/types/database.types';
import { generateRemitoNumber } from '../../../shared/utils/format';
import type {
  SublimationJob,
  SublimationJobInput,
  SublimationJobStatus,
  SublimationJobUpdate,
} from '../types';

interface CompleteJobData {
  actual_cost_total: number;
  actual_notes?: string;
}

export interface DeliverJobData {
  payment_method: 'EFECTIVO' | 'TRANSFERENCIA' | 'CTA_CTE';
  total: number;
  customer: string | null;
}

interface SublimationJobState {
  jobs: SublimationJob[];
  isLoading: boolean;
  error: string | null;

  fetchJobs: () => Promise<void>;
  addJob: (data: SublimationJobInput) => Promise<SublimationJob>;
  updateJob: (id: string, data: SublimationJobUpdate) => Promise<SublimationJob>;
  setStatus: (id: string, status: SublimationJobStatus) => Promise<void>;
  completeJob: (id: string, data: CompleteJobData) => Promise<void>;
  deliverJob: (id: string, data: DeliverJobData) => Promise<{ saleId: string; remitoNumber: string }>;
  deleteJob: (id: string) => Promise<void>;
}

export const useSublimationJobStore = create<SublimationJobState>((set) => ({
  jobs: [],
  isLoading: false,
  error: null,

  fetchJobs: async () => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) return;

    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('sublimation_jobs')
        .select('*, sublimation_designs(name, imagen)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      set({ jobs: (data as unknown as SublimationJob[]) ?? [], isLoading: false });
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
      .from('sublimation_jobs')
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
      jobs: [row as unknown as SublimationJob, ...state.jobs],
    }));

    return row as unknown as SublimationJob;
  },

  updateJob: async (id, data) => {
    const { inputs, ...rest } = data;
    const payload: Omit<SublimationJobUpdate, 'inputs'> & { inputs?: Json } = { ...rest };
    if (inputs !== undefined) payload.inputs = inputs as Json;

    const { data: row, error } = await supabase
      .from('sublimation_jobs')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    set((state) => ({
      jobs: state.jobs.map((j) => (j.id === id ? (row as unknown as SublimationJob) : j)),
    }));

    return row as unknown as SublimationJob;
  },

  setStatus: async (id, status) => {
    await useSublimationJobStore.getState().updateJob(id, { status });
  },

  completeJob: async (id, data) => {
    const job = useSublimationJobStore.getState().jobs.find((j) => j.id === id);
    if (!job) throw new Error('Trabajo no encontrado.');

    await useSublimationJobStore.getState().updateJob(id, {
      status: 'completado',
      completed_at: new Date().toISOString(),
      actual_cost_total: Number(data.actual_cost_total.toFixed(2)),
      actual_notes: data.actual_notes ?? null,
    });
  },

  deliverJob: async (id, data): Promise<{ saleId: string; remitoNumber: string }> => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) throw new Error('No hay compañía activa.');

    const job = useSublimationJobStore.getState().jobs.find((j) => j.id === id);
    if (!job) throw new Error('Trabajo no encontrado.');
    if (job.status === 'entregado') throw new Error('El trabajo ya fue entregado.');

    const specs = [
      job.blank_label ? `Producto: ${job.blank_label}` : null,
      job.size_label ? `Tamaño: ${job.size_label}` : null,
      job.actual_cost_total != null ? `Costo material: $${job.actual_cost_total.toFixed(2)}` : null,
      job.actual_notes ? `Notas: ${job.actual_notes}` : null,
    ]
      .filter(Boolean)
      .join(' · ');

    const itemDescription = `${job.name}${job.quantity > 1 ? ` ×${job.quantity}` : ''}`;

    // 1. Registrar la venta
    const { data: saleRow, error: saleError } = await supabase
      .from('sales')
      .insert({
        company_id: companyId,
        customer_id: null,
        business_unit: 'sublimacion',
        date: new Date().toISOString().slice(0, 10),
        items: [
          {
            description: itemDescription,
            details: specs,
            qty: job.quantity,
            unitPrice: Number(data.total.toFixed(2)),
          },
        ] as unknown as Json,
        payment_method: data.payment_method,
        status: data.payment_method === 'CTA_CTE' ? 'DEUDA' : 'COBRADO',
        total: Number(data.total.toFixed(2)),
        total_amount: Number(data.total.toFixed(2)),
      })
      .select('id')
      .single();
    if (saleError) throw saleError;

    // 2. Generar el remito con el detalle de producción
    const remitoNumber = generateRemitoNumber();
    const { data: remitoRow, error: remitoError } = await supabase
      .from('remitos')
      .insert({
        company_id: companyId,
        order_id: null,
        number: remitoNumber,
        date: new Date().toISOString().slice(0, 10),
        customer: data.customer ?? 'Mostrador',
        address: null,
        status: 'DELIVERED',
        view_type: 'VALUED',
        items: [
          {
            id: crypto.randomUUID(),
            qtyOrdered: job.quantity,
            qtyDelivered: job.quantity,
            description: itemDescription,
            details: specs || 'Producción de sublimación',
            unitPrice: Number(data.total.toFixed(2)),
          },
        ] as unknown as Json,
        total: Number(data.total.toFixed(2)),
        notes: `Generado desde Producción de Sublimación (trabajo ${job.id.slice(0, 8)})`,
      })
      .select('id, number')
      .single();
    if (remitoError) throw remitoError;

    // 3. Vincular y avanzar el trabajo a entregado
    await useSublimationJobStore.getState().updateJob(id, {
      status: 'entregado',
      sale_id: String(saleRow.id),
      remito_id: String(remitoRow.id),
    });

    return { saleId: String(saleRow.id), remitoNumber: String(remitoRow.number) };
  },

  deleteJob: async (id) => {
    const { error } = await supabase.from('sublimation_jobs').delete().eq('id', id);
    if (error) throw error;

    set((state) => ({
      jobs: state.jobs.filter((j) => j.id !== id),
    }));
  },
}));

useTenantStore.subscribe((state, prev) => {
  if (state.activeCompanyId !== prev.activeCompanyId) {
    useSublimationJobStore.setState({ jobs: [], isLoading: false, error: null });
  }
});
