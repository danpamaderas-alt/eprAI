// =============================================================================
// Normalizador único del JSONB orders.items
// =============================================================================
// El JSONB de items llegó a convivir con DOS formas distintas:
//   - Forma canónica (la que escribe OrderForm/OrderMatrixModal):
//       { id, type, productName, variations: [{ id, variantId, size, color,
//         sizeId, colorId, quantityOrdered, quantityDelivered }] }
//   - Forma legacy (interfaz vieja del store):
//       { productId, variations: [{ sizeId, colorId, quantity,
//         quantityDelivered, variationId }] }
//
// TODO lector debe pasar por normalizeOrderItems() antes de renderizar o
// calcular. Las funciones son puras (sin catálogo ni Supabase) para poder
// testearlas con vitest.
// =============================================================================

export interface NormalizedVariation {
  id: string;
  variantId: string | null;
  size: string;
  color: string;
  sizeId: string | null;
  colorId: string | null;
  quantityOrdered: number;
  quantityDelivered: number;
}

export interface NormalizedOrderItem {
  id: string;
  type: 'PRODUCT' | 'SERVICE';
  productName: string;
  variations: NormalizedVariation[];
}

export interface DeliveryTarget {
  itemId: string;
  variationId: string;
  quantity: number;
}

export type DerivedStatus = 'PENDING' | 'PARTIAL' | 'DELIVERED';

const num = (value: unknown): number => {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const str = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

/** Acepta ambas formas (canónica y legacy) y devuelve siempre la canónica. */
export function normalizeOrderItems(raw: unknown): NormalizedOrderItem[] {
  if (!Array.isArray(raw)) return [];

  return raw.map((rawItem, itemIndex) => {
    const item = asRecord(rawItem) ?? {};
    const itemId =
      str(item.id) || str(item.productId) || str(item.product_id) || `item-${itemIndex}`;

    const rawVariations = Array.isArray(item.variations) ? item.variations : [];
    const variations: NormalizedVariation[] = rawVariations.map((rawVar, varIndex) => {
      const v = asRecord(rawVar) ?? {};
      const size = str(v.size);
      const color = str(v.color);
      const sizeId = str(v.sizeId) || str(v.size_id) || null;
      const colorId = str(v.colorId) || str(v.color_id) || null;
      const quantityOrdered = num(v.quantityOrdered ?? v.quantity);
      return {
        id: str(v.id) || str(v.variationId) || `${itemId}:${varIndex}:${size}|${color}`,
        variantId: str(v.variantId) || null,
        size,
        color,
        sizeId,
        colorId,
        quantityOrdered,
        quantityDelivered: Math.min(num(v.quantityDelivered), quantityOrdered),
      };
    });

    return {
      id: itemId,
      type: item.type === 'SERVICE' ? ('SERVICE' as const) : ('PRODUCT' as const),
      productName: str(item.productName) || str(item.name) || str(item.product_id) || str(item.productId) || 'Ítem',
      variations,
    };
  });
}

/** Vuelve a la forma canónica lista para guardar en el JSONB. */
export function serializeOrderItems(items: NormalizedOrderItem[]): Array<Record<string, unknown>> {
  return items.map((item) => ({
    id: item.id,
    type: item.type,
    productName: item.productName,
    variations: item.variations.map((v) => ({
      id: v.id,
      variantId: v.variantId,
      size: v.size,
      color: v.color,
      sizeId: v.sizeId ?? '',
      colorId: v.colorId ?? '',
      quantityOrdered: v.quantityOrdered,
      quantityDelivered: v.quantityDelivered,
    })),
  }));
}

export function itemsTotals(items: NormalizedOrderItem[]): { orderedTotal: number; deliveredTotal: number } {
  let orderedTotal = 0;
  let deliveredTotal = 0;
  items.forEach((item) => {
    item.variations.forEach((v) => {
      orderedTotal += v.quantityOrdered;
      deliveredTotal += v.quantityDelivered;
    });
  });
  return { orderedTotal, deliveredTotal };
}

export function deriveStatus(orderedTotal: number, deliveredTotal: number): DerivedStatus {
  if (orderedTotal > 0 && deliveredTotal >= orderedTotal) return 'DELIVERED';
  if (deliveredTotal > 0) return 'PARTIAL';
  return 'PENDING';
}

/**
 * Aplica entregas sobre los items normalizados (suma y clampea a [0..ordered]).
 * Los objetivos desconocidos se ignoran silenciosamente. Devuelve NUEVO array.
 */
export function applyDeliveriesToItems(
  items: NormalizedOrderItem[],
  deliveries: DeliveryTarget[],
): { items: NormalizedOrderItem[]; orderedTotal: number; deliveredTotal: number; status: DerivedStatus } {
  const qtyByKey = new Map<string, number>();
  deliveries.forEach((d) => {
    const qty = num(d?.quantity);
    if (!qty) return;
    const key = `${str(d.itemId)}::${str(d.variationId)}`;
    qtyByKey.set(key, (qtyByKey.get(key) ?? 0) + qty);
  });

  const next = items.map((item) => ({
    ...item,
    variations: item.variations.map((v) => {
      const qty = qtyByKey.get(`${item.id}::${v.id}`);
      if (!qty) return v;
      return { ...v, quantityDelivered: Math.max(0, Math.min(v.quantityOrdered, v.quantityDelivered + qty)) };
    }),
  }));

  const totals = itemsTotals(next);
  return { items: next, ...totals, status: deriveStatus(totals.orderedTotal, totals.deliveredTotal) };
}

/** Resumen humano para el activity_log: "Entrega parcial: 2x Remera X T S Negro". */
export function describeDeliveries(items: NormalizedOrderItem[], deliveries: DeliveryTarget[]): string {
  const parts: string[] = [];
  deliveries.forEach((d) => {
    const qty = num(d?.quantity);
    if (!qty) return;
    const item = items.find((i) => i.id === str(d.itemId));
    const v = item?.variations.find((x) => x.id === str(d.variationId));
    if (!item || !v) return;
    const bits = [`${qty}x ${item.productName}`];
    if (v.size) bits.push(`T ${v.size}`);
    if (v.color) bits.push(v.color);
    parts.push(bits.join(' '));
  });
  return parts.length ? `Entrega parcial: ${parts.join(', ')}` : 'Entrega parcial';
}
