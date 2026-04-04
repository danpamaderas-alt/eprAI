import { z } from 'zod';

export const transactionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  amount: z.coerce.number().positive('El monto debe ser mayor a cero'),
  concept: z.string().trim().min(3, 'El concepto debe tener al menos 3 caracteres'),
  categoryId: z.string().min(1, 'La categoría es obligatoria'),
  date: z.string().min(1, 'La fecha es obligatoria'),
  accountId: z.enum(['EFECTIVO', 'BANCO', 'MERCADO_PAGO']),
  businessUnit: z.enum(['GENERAL', 'RAICES', 'RJ_CO', 'BITA_IT', 'ROJO_SHOWROOM', 'UNIFORMES']),
  status: z.enum(['COMPLETED', 'PENDING', 'CANCELLED']),
}).strict();

export type TransactionFormValues = z.infer<typeof transactionSchema>;

export interface Transaction extends TransactionFormValues {
  id: string;
  createdAt: string;
}