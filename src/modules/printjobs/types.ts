export type PrintJob3DStatus =
  | 'presupuestado'
  | 'en_cola'
  | 'imprimiendo'
  | 'completado'
  | 'entregado'
  | 'fallido';

export interface PrintJobModelRef {
  name: string;
  imagen: string | null;
  material: string | null;
}

export interface PrintJob3D {
  id: string;
  company_id: string | null;
  name: string;
  status: string;
  inputs: Record<string, unknown>;
  printer_name: string | null;
  filament_id: string | null;
  filament_label: string | null;
  quantity: number;
  est_weight_g: number | null;
  est_time_h: number | null;
  est_cost_total: number | null;
  est_price_total: number | null;
  actual_weight_g: number | null;
  actual_time_h: number | null;
  actual_notes: string | null;
  actual_cost_total: number | null;
  model_id: string | null;
  sale_id: string | null;
  remito_id: string | null;
  print_models?: PrintJobModelRef | null;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PrintJob3DInput {
  name: string;
  status?: PrintJob3DStatus;
  inputs?: Record<string, unknown>;
  printer_name?: string | null;
  filament_id?: string | null;
  filament_label?: string | null;
  quantity?: number;
  est_weight_g?: number | null;
  est_time_h?: number | null;
  est_cost_total?: number | null;
  est_price_total?: number | null;
  model_id?: string | null;
}

export type PrintJob3DUpdate = Partial<
  Omit<PrintJob3D, 'id' | 'company_id' | 'created_at' | 'updated_at' | 'print_models'>
>;

export const PRINT_JOB_STATUSES = [
  'presupuestado',
  'en_cola',
  'imprimiendo',
  'completado',
  'entregado',
  'fallido',
] as const;

export const PRINT_JOB_STATUS_LABELS: Record<PrintJob3DStatus, string> = {
  presupuestado: 'Presupuestado',
  en_cola: 'En cola',
  imprimiendo: 'Imprimiendo',
  completado: 'Completado',
  entregado: 'Entregado',
  fallido: 'Fallido',
};

export const PRINT_JOB_STATUS_STYLES: Record<PrintJob3DStatus, string> = {
  presupuestado: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  en_cola: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  imprimiendo: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  completado: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  entregado: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  fallido: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

/** Siguiente estado natural en el flujo de producción (null si no avanza). */
export const NEXT_STATUS: Partial<Record<PrintJob3DStatus, PrintJob3DStatus>> = {
  presupuestado: 'en_cola',
  en_cola: 'imprimiendo',
  imprimiendo: 'completado',
};
