import { z } from 'zod';

export const productSchema = z.object({
  sku: z.string().trim().toUpperCase().min(3, 'Mínimo 3 caracteres'),
  name: z.string().trim().min(3, 'Nombre muy corto'),
  category: z.string().trim().min(1, 'Categoría obligatoria'),
  // Usamos .number() directo y que el input se encargue de mandarlo como número
  price: z.preprocess((val) => Number(val), z.number().min(0, 'No puede ser negativo')),
  stock: z.preprocess((val) => Number(val), z.number().int().min(0, 'No puede ser negativo')),
  minStock: z.preprocess((val) => Number(val), z.number().int().min(0, 'No puede ser negativo')),
});

// Forzamos la exportación del tipo de esta manera para que sea más robusto
export type ProductFormValues = z.infer<typeof productSchema>;