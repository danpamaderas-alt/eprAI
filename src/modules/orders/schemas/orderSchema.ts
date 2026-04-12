import { z } from 'zod';

// 1. Variante específica
export const itemVariationSchema = z.object({
  id: z.string().uuid('ID de variante inválido'),
  size: z.string().min(1, 'Talle requerido').max(20),
  color: z.string().min(1, 'Color requerido').max(30),
  quantityOrdered: z.coerce.number().int().positive('Mínimo 1 unidad'),
  quantityDelivered: z.coerce.number().int().min(0),
});

// 2. Artículo del pedido
export const orderItemSchema = z.object({
  id: z.string().uuid('ID de artículo inválido'),
  sector: z.string().optional(), // <-- OFICIALIZAMOS EL SECTOR ACÁ
  productName: z.string().min(1, 'El producto es obligatorio').max(200),
  variations: z.array(itemVariationSchema).min(1, 'Debe tener al menos un talle/color'),
});

// 3. Remitos / Historial de entrega
export const deliveryLogSchema = z.object({
  id: z.string().uuid(),
  date: z.string().datetime(), // Fuerza formato ISO
  notes: z.string().max(1000),
  itemsDelivered: z.array(z.object({
    itemId: z.string().uuid(),
    variationId: z.string().uuid(),
    quantity: z.coerce.number().int().positive()
  }))
});

export const orderSchema = z.object({
  customerName: z.string().trim().min(2, 'Nombre obligatorio').max(100),
  businessUnit: z.enum(['GENERAL', 'RAICES', 'RJ_CO', 'BITA_IT', 'ROJO_SHOWROOM', 'UNIFORMES']),
  status: z.enum(['PENDING', 'PARTIAL', 'DELIVERED', 'CANCELLED']),
  dueDate: z.string().min(1, 'Fecha obligatoria'),
  
  // NUEVO: LA BÓVEDA (Plata total y Seña)
  totalAmount: z.coerce.number().optional().default(0),
  advancePayment: z.coerce.number().optional().default(0),

  items: z.array(orderItemSchema).min(1, 'Debe tener al menos un artículo'),
  deliveryHistory: z.array(deliveryLogSchema).optional().default([]), // Previene errores al crear pedido nuevo
});

// Tipos inferidos
export type ItemVariation = z.infer<typeof itemVariationSchema>;
export type OrderItem = z.infer<typeof orderItemSchema>;
export type DeliveryLog = z.infer<typeof deliveryLogSchema>;
export type OrderFormValues = z.infer<typeof orderSchema>;
export interface Order extends OrderFormValues {
  id: string;
  created_at: string;
}