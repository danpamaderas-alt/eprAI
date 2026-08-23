export type PrintStatus =
  | 'Idea'
  | 'En Cola'
  | 'Imprimiendo'
  | 'Completado'
  | 'Descartado';

export const PRINT_STATUS_OPTIONS: readonly PrintStatus[] = [
  'Idea',
  'En Cola',
  'Imprimiendo',
  'Completado',
  'Descartado',
] as const;

export interface PrintModel {
  id: string;
  company_id: string | null;
  name: string;
  category: string;
  status: string;
  link_descarga: string | null;
  imagen: string | null;
  material: string | null;
  layer_height: number | null;
  infill: number | null;
  estimated_time_hours: number | null;
  estimated_grams: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export type PrintModelInput = Pick<PrintModel, 'name'> &
  Partial<Omit<PrintModel, 'id' | 'company_id' | 'created_at' | 'updated_at'>>;

export type PrintModelFileKind = 'stl' | 'gcode';

export interface PrintModelFile {
  id: string;
  company_id: string | null;
  model_id: string;
  kind: string;
  printer_name: string | null;
  file_name: string;
  storage_path: string;
  size_bytes: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export const STATUS_STYLES: Record<PrintStatus, { badge: string; dot: string; ring: string }> = {
  Idea: {
    badge: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    dot: 'bg-slate-400',
    ring: 'border-slate-500/30',
  },
  'En Cola': {
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    dot: 'bg-amber-400',
    ring: 'border-amber-500/30',
  },
  Imprimiendo: {
    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    dot: 'bg-blue-400',
    ring: 'border-blue-500/30',
  },
  Completado: {
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    dot: 'bg-emerald-400',
    ring: 'border-emerald-500/30',
  },
  Descartado: {
    badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    dot: 'bg-rose-400',
    ring: 'border-rose-500/30',
  },
};

export const DEFAULT_CATEGORIES = [
  'General',
  'Funcional',
  'Decorativo',
  'Juguetes',
  'Organizador',
  'Repuesto',
  'Accesorio',
  'Cosplay',
  'Otra',
] as const;

export const DOWNLOAD_PLATFORMS = ['MakerWorld', 'Thingiverse', 'Cults3D', 'Printables', 'MyMiniFactory', 'Otro'] as const;