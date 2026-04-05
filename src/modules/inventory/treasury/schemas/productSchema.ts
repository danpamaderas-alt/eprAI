import { z } from 'zod';

export const productSchema = z.object({
  // Seguridad: Límites máximos estrictos
  sku: z.string().trim().toUpperCase()
    .min(3, 'Mínimo 3 caracteres')
    .max(50, 'Máximo 50 caracteres'), 
  
  name: z.string().trim()
    .min(3, 'Nombre muy corto')
    .max(120, 'Máximo 120 caracteres'),
  
  category: z.string().trim()
    .min(1, 'Categoría obligatoria')
    .max(60, 'Categoría no válida'),
  
  // CORRECCIÓN TS2353: coerce.number() no recibe argumentos de error aquí
  price: z.coerce.number()
    .min(0, 'No puede ser negativo'),
  
  stock: z.coerce.number().int().min(0, 'No puede ser negativo').default(0), 
  
  minStock: z.coerce.number().int().min(0, 'No puede ser negativo').default(5),
  
  variations: z.array(z.object({
    id: z.string().uuid('Identificador de variante corrupto'),
    size: z.string().min(1, 'Talle requerido').max(20),
    color: z.string().min(1, 'Color requerido').max(30),
    stock: z.coerce.number().int().min(0, 'Stock inválido')
  }))
  .default([])
  .refine((variations) => {
    const uniqueCombos = new Set(variations.map(v => `${v.size}-${v.color}`));
    return uniqueCombos.size === variations.length;
  }, { message: "Existen variantes duplicadas (mismo talle y color)" })
});

export type ProductFormValues = z.infer<typeof productSchema>;

export interface Product extends ProductFormValues {
  id: string;
  createdAt: string; 
  status: 'ACTIVE' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}