import { z } from 'zod';

const variationSchema = z.object({
  id: z.string(),
  size: z.string(),
  color: z.string(),
  stock: z.number().min(0)
});

export const productSchema = z.object({
  sku: z.string().min(1, 'Obligatorio'),
  name: z.string().min(1, 'Obligatorio'),
  category: z.string().min(1, 'Obligatorio'),
  price: z.number().min(0),
  cost: z.number().min(0).optional(),
  notes: z.string().optional(),
  location: z.string().optional(),
  stock: z.number().min(0),
  minStock: z.number().min(0),
  variations: z.array(variationSchema).optional()
});

export type ProductFormValues = z.infer<typeof productSchema>;