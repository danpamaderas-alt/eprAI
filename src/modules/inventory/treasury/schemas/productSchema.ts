import { z } from 'zod';

export const productSchema = z.object({
  sku: z.string().trim().toUpperCase().min(3, 'Mínimo 3 caracteres'),
  name: z.string().trim().min(3, 'Nombre muy corto'),
  category: z.string().trim().min(1, 'Categoría obligatoria'),
  price: z.preprocess((val) => Number(val), z.number().min(0, 'No puede ser negativo')),
  stock: z.preprocess((val) => Number(val), z.number().int().min(0)).default(0), 
  minStock: z.preprocess((val) => Number(val), z.number().int().min(0, 'No puede ser negativo')),
  
  variations: z.array(z.object({
    id: z.string(),
    size: z.string(),
    color: z.string(),
    stock: z.preprocess((val) => Number(val), z.number().int().min(0))
  })).default([])
});

export type ProductFormValues = z.infer<typeof productSchema>;

export interface Product extends ProductFormValues {
  id: string;
  createdAt?: string;
  status: 'ACTIVE' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}