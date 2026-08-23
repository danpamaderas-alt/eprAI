export interface MockupTemplate {
  id: string;
  company_id: string | null;
  name: string;
  product_type: string;
  print_area_width_mm: number | null;
  print_area_height_mm: number | null;
  template_image: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type MockupTemplateInput = Pick<MockupTemplate, 'name'> &
  Partial<Omit<MockupTemplate, 'id' | 'company_id' | 'created_at' | 'updated_at'>>;

export const TEMPLATE_PRODUCT_TYPES = [
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
  'Otro',
] as const;
