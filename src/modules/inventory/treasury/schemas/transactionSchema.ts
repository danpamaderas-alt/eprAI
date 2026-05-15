import { z } from 'zod';

export const transactionSchema = z.object({
  date: z.string().min(1),
  description: z.string().trim().min(2, "El detalle es obligatorio"),
  amount: z.preprocess((val) => Number(val), z.number().min(0.01, "Monto mayor a 0")),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  category: z.string().min(1),
  businessUnit: z.enum(['SHOWROOM', 'UNIFORMES', 'GENERAL', 'RAICES', 'ROJO_SHOWROOM', 'RJ_CO', 'BITA_IT']).default('GENERAL'),
  paymentMethod: z.enum(['MERCADO_PAGO', 'BANCO', 'EFECTIVO']).default('EFECTIVO'),
  // Le agregamos 'CANCELLED' a la lista de permitidos
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).default('COMPLETED')
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;

export interface Transaction extends TransactionFormValues {
  id: string;
  createdAt?: string; 
}