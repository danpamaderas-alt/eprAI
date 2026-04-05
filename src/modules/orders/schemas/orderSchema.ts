import { z } from 'zod';

// 1. Variante específica
export const itemVariationSchema = z.object({
  // Usamos uuid() para asegurar que el ID sea válido
  id: z.string().uuid('ID de variante inválido'),
  size: z.string().min(1, 'Talle requerido').max(20),
  color: z.string().min(1, 'Color requerido').max(30),
  // z.coerce asegura que si el input manda un string, se convierta a número
  quantityOrdered: z.coerce.number().int().positive('Mínimo 1 unidad'),
  // Eliminamos el .default(0) para evitar el error de "undefined" en el build
  quantityDelivered: z.coerce.number().int().min(0),
});

// 2. Artículo del pedido
export const orderItemSchema = z.object({
  id: z.string().uuid('ID de artículo inválido'),
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
  // Validamos que sea una fecha real
  dueDate: z.string().min(1, 'Fecha obligatoria'),
  items: z.array(orderItemSchema).min(1, 'Debe tener al menos un artículo'),
  // Cambiamos .default([]) por una validación de array simple para evitar errores de tipo
  deliveryHistory: z.array(deliveryLogSchema),
});

// Tipos inferidos
export type ItemVariation = z.infer<typeof itemVariationSchema>;
export type OrderItem = z.infer<typeof orderItemSchema>;
export type DeliveryLog = z.infer<typeof deliveryLogSchema>;
export type OrderFormValues = z.infer<typeof orderSchema>;

export interface Order extends OrderFormValues {
  id: string;
  createdAt: string;
}