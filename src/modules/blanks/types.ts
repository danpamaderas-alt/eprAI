export interface TextileBlank {
  id: string;
  company_id: string | null;
  name: string;
  type: string;
  size: string | null;
  color: string | null;
  provider: string | null;
  cost_price: number;
  stock_qty: number;
  min_stock: number;
  imagen: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type TextileBlankInput = Pick<TextileBlank, 'name'> &
  Partial<Omit<TextileBlank, 'id' | 'company_id' | 'created_at' | 'updated_at'>>;

export const BLANK_TYPES = [
  'Taza',
  'Remera',
  'Tumbler',
  'Termo',
  'Gorra',
  'Almohadón',
  'Mousepad',
  'Llavero',
  'Plato',
  'Vidrio',
  'Tela',
  'Otro',
] as const;
