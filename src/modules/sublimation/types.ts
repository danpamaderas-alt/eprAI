export type SublimationStatus =
  | 'Nuevo'
  | 'Descargado'
  | 'En Preparación'
  | 'Listo para Imprimir'
  | 'Usado'
  | 'Archivado';

export const SUBLIMATION_STATUS_OPTIONS: readonly SublimationStatus[] = [
  'Nuevo',
  'Descargado',
  'En Preparación',
  'Listo para Imprimir',
  'Usado',
  'Archivado',
] as const;

export interface SublimationDesign {
  id: string;
  company_id: string | null;
  name: string;
  category: string;
  status: string;
  platform: string | null;
  url_original: string | null;
  link_descarga: string | null;
  imagen: string | null;
  file_format: string | null;
  background: string | null;
  dpi: number | null;
  dimensions: string | null;
  file_size_mb: number | null;
  bundle_count: number | null;
  project_dest: string | null;
  license_type: string | null;
  pod_permitido: boolean | null;
  pod_nivel: string | null;
  ventas_limit: number | null;
  atribucion_requerida: boolean | null;
  license_file: string | null;
  license_date: string | null;
  price: number | null;
  currency: string | null;
  designer: string | null;
  origin: string | null;
  purchase_date: string | null;
  tags: string | null;
  description: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type SublimationDesignInput = Pick<SublimationDesign, 'name'> &
  Partial<
    Omit<SublimationDesign, 'id' | 'company_id' | 'created_at' | 'updated_at'>
  >;

export const STATUS_STYLES: Record<
  SublimationStatus,
  { badge: string; dot: string; ring: string }
> = {
  Nuevo: {
    badge: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
    dot: 'bg-violet-400',
    ring: 'border-violet-500/30',
  },
  Descargado: {
    badge: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    dot: 'bg-sky-400',
    ring: 'border-sky-500/30',
  },
  'En Preparación': {
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    dot: 'bg-amber-400',
    ring: 'border-amber-500/30',
  },
  'Listo para Imprimir': {
    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    dot: 'bg-blue-400',
    ring: 'border-blue-500/30',
  },
  Usado: {
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    dot: 'bg-emerald-400',
    ring: 'border-emerald-500/30',
  },
  Archivado: {
    badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    dot: 'bg-rose-400',
    ring: 'border-rose-500/30',
  },
};

export const DEFAULT_CATEGORIES = [
  'General',
  'Fútbol',
  'Día de la Madre',
  'Día del Padre',
  'Navidad',
  'Cumpleaños',
  'Baby Shower',
  'San Valentín',
  'Halloween',
  'Año Nuevo',
  'Frases',
  'Flork',
  'Deportes',
  'Mascotas',
  'Religioso',
  'Escolar',
  'Boda',
  'Retro',
  'Boho',
  'Otra',
] as const;

export const DOWNLOAD_PLATFORMS = [
  'Creative Fabrica',
  'Design Bundles',
  'Etsy',
  'The Hungry JPEG',
  'So Fontsy',
  'Vexels',
  'Creative Market',
  'Freepik',
  'Vecteezy',
  'Envato Elements',
  'MyDigitalStudio',
  'Otro',
] as const;

export const FILE_FORMATS = [
  'SVG',
  'PNG simple',
  'PNG en capas',
  'PDF',
  'EPS',
  'AI',
  'DXF',
  'PSD',
  'ZIP / Bundle',
] as const;

export const BACKGROUNDS = ['Transparente', 'Con fondo', 'Mixto'] as const;

export const PROJECT_DESTINATIONS = [
  'Taza 11oz',
  'Taza 15oz',
  'Tumbler 20oz',
  'Tumbler 30oz',
  'Camiseta',
  'Plato',
  'Termo',
  'Mousepad',
  'Gorra',
  'Llavero',
  'Almohadón',
  'Otro',
] as const;

export const LICENSE_TYPES = ['Personal', 'Comercial', 'Comercial + POD'] as const;

export const POD_LEVELS = ['Básico', 'Completo'] as const;

export const ORIGINS = ['Comprado', 'Gratis', 'Suscripción', 'Propio'] as const;

export const CURRENCIES = ['ARS', 'USD', 'EUR', 'MXN', 'CLP', 'COP'] as const;