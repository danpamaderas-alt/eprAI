import { z } from 'zod';

// 1. Nueva estructura: Variante específica (Ej: Talle L, Azul)
export const itemVariationSchema = z.object({
  id: z.string(),
  size: z.string().min(1, 'Talle requerido'),
  color: z.string().min(1, 'Color requerido'),
  quantityOrdered: z.number().min(1),
  quantityDelivered: z.number().default(0),
});

// 2. El artículo ahora contiene una lista de variantes
export const orderItemSchema = z.object({
  id: z.string(),
  productName: z.string().min(1, 'El producto es obligatorio'),
  variations: z.array(itemVariationSchema).min(1, 'Debe tener al menos un talle/color'),
});

// 3. El remito ahora anota exactamente qué variante se entregó
export const deliveryLogSchema = z.object({
  id: z.string(),
  date: z.string(),
  notes: z.string(),
  itemsDelivered: z.array(z.object({
    itemId: z.string(),
    variationId: z.string(), // ¡Agregamos esto para saber qué talle/color fue!
    quantity: z.number()
  }))
});

export const orderSchema = z.object({
  customerName: z.string().trim().min(2, 'Nombre obligatorio'),
  businessUnit: z.enum(['GENERAL', 'RAICES', 'RJ_CO', 'BITA_IT', 'ROJO_SHOWROOM', 'UNIFORMES']),
  status: z.enum(['PENDING', 'PARTIAL', 'DELIVERED', 'CANCELLED']),
  dueDate: z.string().min(1, 'Fecha de entrega obligatoria'),
  items: z.array(orderItemSchema).min(1, 'Debe tener al menos un artículo'),
  deliveryHistory: z.array(deliveryLogSchema).default([]),
});

export type ItemVariation = z.infer<typeof itemVariationSchema>;
export type OrderItem = z.infer<typeof orderItemSchema>;
export type DeliveryLog = z.infer<typeof deliveryLogSchema>;
export type OrderFormValues = z.infer<typeof orderSchema>;

export interface Order extends OrderFormValues {
  id: string;
  createdAt: string;
}