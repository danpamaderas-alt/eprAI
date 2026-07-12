import { z } from 'zod';

// 1. Variante específica (Talles y Colores)
export const itemVariationSchema = z.object({
  id: z.string().min(1, 'ID requerido'), // Modificado para aceptar IDs temporales del frontend
  size: z.string().min(1, 'Talle requerido').max(20),
  color: z.string().min(1, 'Color requerido').max(30),
  quantityOrdered: z.coerce.number().int().positive('Mínimo 1 unidad'),
  quantityDelivered: z.coerce.number().int().min(0),
  variantId: z.string().nullable().optional(),
  sizeId: z.string().optional(),
  colorId: z.string().optional(),
});

// 2. Artículo del pedido (Prenda o Servicio)
export const orderItemSchema = z.object({
  id: z.string().min(1, 'ID requerido'), // Modificado para aceptar IDs temporales del frontend
  type: z.enum(['PRODUCT', 'SERVICE']).default('PRODUCT'), // ✅ NUEVO: Le avisa a Zod si es prenda o servicio
  sector: z.string().optional(),
  productName: z.string().min(1, 'El nombre es obligatorio').max(200),
  variations: z.array(itemVariationSchema).optional().default([]), // ✅ NUEVO: Quitamos el .min(1) para que los Servicios puedan pasar vacíos
});

// 3. Remitos / Historial de entrega
export const deliveryLogSchema = z.object({
  id: z.string().min(1),
  date: z.string().datetime(), // Fuerza formato ISO
  notes: z.string().max(1000),
  itemsDelivered: z.array(z.object({
    itemId: z.string().min(1),
    variationId: z.string().min(1),
    quantity: z.coerce.number().int().positive()
  }))
});

// 4. El Pedido Completo
export const orderSchema = z.object({
  customerName: z.string().trim().min(2, 'Nombre obligatorio').max(100),
  businessUnit: z.enum(['GENERAL', 'RAICES', 'RJ_CO', 'BITA_IT', 'ROJO_SHOWROOM', 'UNIFORMES']),
  status: z.enum(['PENDING', 'PARTIAL', 'DELIVERED', 'CANCELLED']),
  dueDate: z.string().min(1, "La fecha es requerida"),
  
  // LA BÓVEDA (Plata total y Seña)
  totalAmount: z.coerce.number().optional().default(0),
  advancePayment: z.coerce.number().optional().default(0),

  items: z.array(orderItemSchema).min(1, 'Debe tener al menos un artículo (Prenda o Servicio)'),
  deliveryHistory: z.array(deliveryLogSchema).optional().default([]), // Previene errores al crear pedido nuevo
});

// Tipos inferidos para TypeScript
export type ItemVariation = z.infer<typeof itemVariationSchema>;
export type OrderItem = z.infer<typeof orderItemSchema>;
export type DeliveryLog = z.infer<typeof deliveryLogSchema>;
export type OrderFormValues = z.infer<typeof orderSchema>;
export interface Order extends OrderFormValues {
  id: string;
  created_at: string;
}