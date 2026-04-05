import { z } from 'zod';

export const productSchema = z.object({
  // Seguridad: Límites máximos estrictos (Fallo rápido ante payloads maliciosos)
  sku: z.string().trim().toUpperCase()
    .min(3, 'Mínimo 3 caracteres')
    .max(50, 'Máximo 50 caracteres'), 
  
  name: z.string().trim()
    .min(3, 'Nombre muy corto')
    .max(120, 'Máximo 120 caracteres'),
  
  category: z.string().trim()
    .min(1, 'Categoría obligatoria')
    .max(60, 'Categoría no válida'),
  
  // Optimización: Uso de coerce nativo de Zod
  // Nota: Si el precio NO puede ser gratis, cambiar .min(0) a .min(0.01)
  price: z.coerce.number({ invalid_type_error: "Debe ser un número válido" })
    .min(0, 'No puede ser negativo'),
  
  stock: z.coerce.number().int().min(0, 'No puede ser negativo').default(0), 
  
  minStock: z.coerce.number().int().min(0, 'No puede ser negativo').default(5),
  
  variations: z.array(z.object({
    id: z.string().uuid('Identificador de variante corrupto'), // Validación UUID obligatoria
    size: z.string().min(1, 'Talle requerido').max(20),
    color: z.string().min(1, 'Color requerido').max(30),
    stock: z.coerce.number().int().min(0, 'Stock inválido')
  }))
  .default([])
  // Integridad: Bloqueo de colisiones (variantes duplicadas) en tiempo de ejecución
  .refine((variations) => {
    const uniqueCombos = new Set(variations.map(v => `${v.size}-${v.color}`));
    return uniqueCombos.size === variations.length;
  }, { message: "Existen variantes duplicadas (mismo talle y color)" })
});

export type ProductFormValues = z.infer<typeof productSchema>;

// Separación de Responsabilidades: DTO vs Entidad
// La entidad Product representa un registro real en la BBDD. Nada de '?' en columnas NOT NULL.
export interface Product extends ProductFormValues {
  id: string;
  createdAt: string; // Garantizado por PostgreSQL
  status: 'ACTIVE' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}