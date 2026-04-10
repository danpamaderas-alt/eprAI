import { z } from 'zod';

// Validador para crear o editar una Cuenta (Banco/Billetera)
export const accountSchema = z.object({
  name: z.string().min(1, 'El nombre de la cuenta es obligatorio'),
  type: z.enum(['BANK', 'WALLET', 'CASH'], { required_error: 'Seleccioná el tipo de cuenta' }),
  balance: z.number().optional().default(0), // Para cargar el saldo inicial
});

export type AccountFormValues = z.infer<typeof accountSchema>;

// Validador para crear o editar un Movimiento de dinero
export const transactionSchema = z.object({
  account_id: z.string().min(1, 'Debes seleccionar una cuenta de origen/destino'),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  category: z.string().min(1, 'La categoría es obligatoria'),
  amount: z.number().min(0.01, 'El monto debe ser mayor a 0'),
  description: z.string().optional(),
  status: z.enum(['COMPLETED', 'PENDING']).default('COMPLETED'),
  date: z.string().min(1, 'La fecha es obligatoria'), // Guardamos la fecha en formato YYYY-MM-DD
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;