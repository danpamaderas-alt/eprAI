import { z } from 'zod';

export const transactionSchema = z.object({
  date: z.string().min(1),
  description: z.string().trim().min(2, "El detalle es obligatorio"),
  amount: z.preprocess((val) => Number(val), z.number().min(0.01, "Monto mayor a 0")),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']), // Agregamos TRANSFER
  category: z.string().min(1),
  businessUnit: z.enum(['SHOWROOM', 'UNIFORMES', 'GENERAL', 'RAICES', 'ROJO_SHOWROOM', 'RJ_CO', 'BITA_IT']).default('GENERAL'),
  paymentMethod: z.enum(['MERCADO_PAGO', 'BANCO', 'EFECTIVO']).default('EFECTIVO'),
  status: z.enum(['PENDING', 'COMPLETED']).default('COMPLETED')
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;

export interface Transaction extends TransactionFormValues {
  id: string;
  createdAt?: string; 
}

  // Optimización: Límite de caracteres para evitar abusos de memoria
  description: z.string()
    .trim()
    .min(3, 'La descripción es muy corta')
    .max(255, 'La descripción supera el límite permitido'),
  
  // Seguridad: Coerción nativa. Si es vacío, falla correctamente.
  amount: z.coerce.number()
    .min(0.01, 'El monto debe ser mayor a cero'),
  
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  
  category: z.string().min(1, 'La categoría es obligatoria').max(50),
  
  // Alineación con SQL: Sincronizado con las restricciones CHECK de la BBDD
  businessUnit: z.enum([
    'GENERAL', 
    'RAICES', 
    'RJ_CO', 
    'BITA_IT', 
    'ROJO_SHOWROOM', 
    'UNIFORMES'
  ]).default('GENERAL'),
  
  paymentMethod: z.enum([
    'MERCADO_PAGO', 
    'BANCO', 
    'EFECTIVO'
  ]).default('EFECTIVO'),
  
  status: z.enum([
    'PENDING', 
    'COMPLETED', 
    'CANCELLED'
  ]).default('COMPLETED')
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;

// Entidad de Dominio: Representa el objeto una vez recuperado de la base de datos
export interface Transaction extends TransactionFormValues {
  id: string;
  createdAt: string; // ISO String garantizado por Postgres
  user_id: string;   // Trazabilidad de auditoría
}