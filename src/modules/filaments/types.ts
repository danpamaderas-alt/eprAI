export interface PrintFilament {
  id: string;
  company_id: string | null;
  brand: string;
  material: string;
  color_name: string | null;
  color_hex: string | null;
  spool_weight_g: number;
  remaining_g: number;
  cost_per_kg: number | null;
  min_stock_g: number;
  provider: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type PrintFilamentInput = Pick<PrintFilament, 'brand'> &
  Partial<Omit<PrintFilament, 'id' | 'company_id' | 'created_at' | 'updated_at'>>;

export const FILAMENT_MATERIALS = [
  'PLA',
  'PLA+',
  'PETG',
  'ABS',
  'ASA',
  'TPU',
  'PA',
  'PC',
  'Otro',
] as const;

export const COLOR_PRESETS: { name: string; hex: string }[] = [
  { name: 'Negro', hex: '#1a1a1a' },
  { name: 'Blanco', hex: '#f8f8f8' },
  { name: 'Gris', hex: '#9ca3af' },
  { name: 'Rojo', hex: '#dc2626' },
  { name: 'Naranja', hex: '#ea580c' },
  { name: 'Amarillo', hex: '#eab308' },
  { name: 'Verde', hex: '#16a34a' },
  { name: 'Celeste', hex: '#38bdf8' },
  { name: 'Azul', hex: '#2563eb' },
  { name: 'Violeta', hex: '#7c3aed' },
  { name: 'Rosa', hex: '#ec4899' },
  { name: 'Dorado', hex: '#d4af37' },
  { name: 'Plateado', hex: '#c0c0c0' },
  { name: 'Marrón', hex: '#78350f' },
  { name: 'Transparente', hex: '#e2e8f0' },
];
