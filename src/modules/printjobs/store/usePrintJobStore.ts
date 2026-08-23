import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import { useTenantStore } from '../../../store/useTenantStore';
import { useFilamentStore } from '../../filaments/store/useFilamentStore';
import type { Json } from '../../../shared/types/database.types';
import { hoursToTime } from '../../../shared/utils/format';
import type { PrintJob3D, PrintJob3DInput, PrintJob3DStatus, PrintJob3DUpdate } from '../types';

interface CompleteJobData {
  actual_weight_g: number;
  actual_time_h: number;
  actual_notes?: string;
}

export interface DeliverJobData {
  payment_method: 'EFECTIVO' | 'TRANSFERENCIA' | 'CTA_CTE';
  total: number;
  customer: string | null;
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
  deliverJob: (id: string, data: DeliverJobData) => Promise<{ saleId: string; remitoNumber: string }>;
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
        .select('*, print_models(name, imagen, material)')
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

    // Costo real de material: peso real × costo por gramo del rollo usado
    const filament = job.filament_id
      ? useFilamentStore.getState().filaments.find((f) => f.id === job.filament_id)
      : undefined;
    const actualCost =
      filament?.cost_per_kg != null
        ? Number(((filament.cost_per_kg / 1000) * data.actual_weight_g).toFixed(2))
        : null;

    await usePrintJobStore.getState().updateJob(id, {
      status: 'completado',
      actual_weight_g: data.actual_weight_g,
      actual_time_h: data.actual_time_h,
      actual_notes: data.actual_notes ?? null,
      actual_cost_total: actualCost,
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

  deliverJob: async (id, data): Promise<{ saleId: string; remitoNumber: string }> => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) throw new Error('No hay compañía activa.');

    const job = usePrintJobStore.getState().jobs.find((j) => j.id === id);
    if (!job) throw new Error('Trabajo no encontrado.');
    if (job.status === 'entregado') throw new Error('El trabajo ya fue entregado.');

    const specs = [
      job.printer_name ? `Impresora: ${job.printer_name}` : null,
      job.filament_label ? `Material: ${job.filament_label}` : null,
      job.actual_weight_g != null ? `Peso real: ${Math.round(Number(job.actual_weight_g))}g` : null,
      job.actual_time_h != null ? `Tiempo real: ${hoursToTime(Number(job.actual_time_h))}` : null,
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
        business_unit: 'impresion-3d',
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

    // 2. Generar el remito con el detalle de impresión
    const remitoNumber = `0001-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
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
            details: specs || 'Producción 3D',
            unitPrice: Number(data.total.toFixed(2)),
          },
        ] as unknown as Json,
        total: Number(data.total.toFixed(2)),
        notes: `Generado desde Producción 3D (trabajo ${job.id.slice(0, 8)})`,
      })
      .select('id, number')
      .single();
    if (remitoError) throw remitoError;

    // 3. Vincular y avanzar el trabajo a entregado
    await usePrintJobStore.getState().updateJob(id, {
      status: 'entregado',
      sale_id: String(saleRow.id),
      remito_id: String(remitoRow.id),
    });

    return { saleId: String(saleRow.id), remitoNumber: String(remitoRow.number) };
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
