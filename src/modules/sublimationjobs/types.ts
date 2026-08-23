export type SublimationJobStatus =
  | 'presupuestado'
  | 'en_cola'
  | 'imprimiendo'
  | 'completado'
  | 'entregado'
  | 'fallido';

export interface SublimationJobDesignRef {
  name: string;
  imagen: string | null;
}

export interface SublimationJob {
  id: string;
  company_id: string | null;
  name: string;
  status: string;
  inputs: Record<string, unknown>;
  design_id: string | null;
  blank_id: string | null;
  blank_label: string | null;
  size_label: string | null;
  quantity: number;
  est_cost_total: number | null;
  est_price_total: number | null;
  actual_cost_total: number | null;
  actual_notes: string | null;
  sale_id: string | null;
  remito_id: string | null;
  sublimation_designs?: SublimationJobDesignRef | null;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface SublimationJobInput {
  name: string;
  status?: SublimationJobStatus;
  inputs?: Record<string, unknown>;
  design_id?: string | null;
  blank_id?: string | null;
  blank_label?: string | null;
  size_label?: string | null;
  quantity?: number;
  est_cost_total?: number | null;
  est_price_total?: number | null;
}

export type SublimationJobUpdate = Partial<
  Omit<SublimationJob, 'id' | 'company_id' | 'created_at' | 'updated_at' | 'sublimation_designs'>
>;

export const SUBLIMATION_JOB_STATUSES = [
  'presupuestado',
  'en_cola',
  'imprimiendo',
  'completado',
  'entregado',
  'fallido',
] as const;

export const SUBLIMATION_JOB_STATUS_LABELS: Record<SublimationJobStatus, string> = {
  presupuestado: 'Presupuestado',
  en_cola: 'En cola',
  imprimiendo: 'Imprimiendo',
  completado: 'Completado',
  entregado: 'Entregado',
  fallido: 'Fallido',
};

export const SUBLIMATION_JOB_STATUS_STYLES: Record<SublimationJobStatus, string> = {
  presupuestado: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  en_cola: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  imprimiendo: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  completado: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  entregado: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  fallido: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

/** Siguiente estado natural en el flujo de producción (null si no avanza). */
export const SUBLIMATION_NEXT_STATUS: Partial<Record<SublimationJobStatus, SublimationJobStatus>> = {
  presupuestado: 'en_cola',
  en_cola: 'imprimiendo',
  imprimiendo: 'completado',
};
