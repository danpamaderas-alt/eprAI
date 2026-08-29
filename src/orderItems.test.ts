import { describe, expect, it } from 'vitest';
import {
  applyDeliveriesToItems,
  deriveStatus,
  describeDeliveries,
  itemsTotals,
  normalizeOrderItems,
  serializeOrderItems,
} from './modules/orders/utils/orderItems';

const canonicalItem = {
  id: 'item-1',
  type: 'PRODUCT',
  productName: 'Remera Subli',
  variations: [
    { id: 'var-1', variantId: null, size: 'S', color: 'Negro', sizeId: '', colorId: '', quantityOrdered: 5, quantityDelivered: 2 },
    { id: 'var-2', variantId: 'uuid-variant', size: 'L', color: 'Blanco', sizeId: 'sid', colorId: 'cid', quantityOrdered: 3, quantityDelivered: 0 },
  ],
};

describe('normalizeOrderItems', () => {
  it('mantiene la forma canónica tal cual', () => {
    const result = normalizeOrderItems([canonicalItem]);
    expect(result).toHaveLength(1);
    expect(result[0].productName).toBe('Remera Subli');
    expect(result[0].variations[0]).toMatchObject({ id: 'var-1', size: 'S', color: 'Negro', quantityOrdered: 5, quantityDelivered: 2 });
  });

  it('normaliza la forma legacy (productId / quantity / variationId)', () => {
    const legacy = {
      productId: 'prod-9',
      variations: [{ sizeId: 'sid-1', colorId: 'cid-1', quantity: 4, quantityDelivered: 1, variationId: 'vid-1' }],
    };
    const [item] = normalizeOrderItems([legacy]);
    expect(item.productName).toBe('prod-9');
    expect(item.id).toBe(legacy.productId);
    const v = item.variations[0];
    // El id sintético debe ser estable entre llamadas (match de entregas)
    expect(v.id).toBe(normalizeOrderItems([legacy])[0].variations[0].id);
    expect(v.id).toBe('vid-1');
    expect(v.quantityOrdered).toBe(4);
    expect(v.quantityDelivered).toBe(1);
    expect(v.variantId).toBeNull();
  });

  it('clampea quantityDelivered a quantityOrdered', () => {
    const [item] = normalizeOrderItems([{ id: 'a', productName: 'X', variations: [{ id: 'v', size: 'M', color: 'N', quantityOrdered: 2, quantityDelivered: 99 }] }]);
    expect(item.variations[0].quantityDelivered).toBe(2);
  });

  it('devuelve [] con basura (null, string, objeto suelto)', () => {
    expect(normalizeOrderItems(null)).toEqual([]);
    expect(normalizeOrderItems('nope')).toEqual([]);
    expect(normalizeOrderItems({ nope: true })).toEqual([]);
  });

  it('tolera items sin id ni variaciones', () => {
    const [item] = normalizeOrderItems([{ productName: 'Servicio', type: 'SERVICE' }]);
    expect(item.id).toBe('item-0');
    expect(item.type).toBe('SERVICE');
    expect(item.variations).toEqual([]);
  });
});

describe('itemsTotals + deriveStatus', () => {
  it('suma pedidas y entregadas', () => {
    const items = normalizeOrderItems([canonicalItem]);
    expect(itemsTotals(items)).toEqual({ orderedTotal: 8, deliveredTotal: 2 });
  });

  it('deriva PENDING / PARTIAL / DELIVERED', () => {
    expect(deriveStatus(8, 0)).toBe('PENDING');
    expect(deriveStatus(8, 2)).toBe('PARTIAL');
    expect(deriveStatus(8, 8)).toBe('DELIVERED');
    expect(deriveStatus(0, 0)).toBe('PENDING');
  });
});

describe('applyDeliveriesToItems', () => {
  it('aplica la entrega y recalcula status', () => {
    const items = normalizeOrderItems([canonicalItem]);
    const r = applyDeliveriesToItems(items, [{ itemId: 'item-1', variationId: 'var-1', quantity: 3 }]);
    expect(r.items[0].variations[0].quantityDelivered).toBe(5);
    expect(r.deliveredTotal).toBe(5);
    expect(r.status).toBe('PARTIAL');
  });

  it('clampea al total pedido y marca DELIVERED', () => {
    const items = normalizeOrderItems([canonicalItem]);
    const r = applyDeliveriesToItems(items, [
      { itemId: 'item-1', variationId: 'var-1', quantity: 50 },
      { itemId: 'item-1', variationId: 'var-2', quantity: 3 },
    ]);
    expect(r.items[0].variations[0].quantityDelivered).toBe(5);
    expect(r.status).toBe('DELIVERED');
  });

  it('ignora objetivos desconocidos y cantidades inválidas, y no muta el input', () => {
    const items = normalizeOrderItems([{ ...canonicalItem, variations: [canonicalItem.variations[0]] }]);
    const snapshot = JSON.stringify(items);
    const r = applyDeliveriesToItems(items, [
      { itemId: 'fantasma', variationId: 'x', quantity: 5 },
      { itemId: 'item-1', variationId: 'var-1', quantity: 0 },
      { itemId: 'item-1', variationId: 'var-1', quantity: -3 },
    ]);
    expect(JSON.stringify(items)).toBe(snapshot);
    expect(r.deliveredTotal).toBe(2);
    expect(r.status).toBe('PARTIAL');
  });

  it('suma entregas duplicadas para la misma variación', () => {
    const items = normalizeOrderItems([{ ...canonicalItem, variations: [canonicalItem.variations[1]] }]);
    const r = applyDeliveriesToItems(items, [
      { itemId: 'item-1', variationId: 'var-2', quantity: 1 },
      { itemId: 'item-1', variationId: 'var-2', quantity: 2 },
    ]);
    expect(r.items[0].variations[0].quantityDelivered).toBe(3);
    expect(r.status).toBe('DELIVERED');
  });
});

describe('serializeOrderItems (round-trip)', () => {
  it('serializa con las claves que espera el JSONB y sobrevive un ciclo completo', () => {
    const round = serializeOrderItems(applyDeliveriesToItems(normalizeOrderItems([canonicalItem]), [{ itemId: 'item-1', variationId: 'var-1', quantity: 1 }]).items);
    const again = normalizeOrderItems(round);
    expect(again[0].variations[0]).toMatchObject({ id: 'var-1', size: 'S', color: 'Negro', quantityOrdered: 5, quantityDelivered: 3 });
    expect((round[0] as { variations: Array<Record<string, unknown>> }).variations[0]).toHaveProperty('sizeId', '');
  });
});

describe('describeDeliveries', () => {
  it('arma resumen legible para activity_log', () => {
    const items = normalizeOrderItems([canonicalItem]);
    expect(describeDeliveries(items, [{ itemId: 'item-1', variationId: 'var-1', quantity: 2 }])).toBe(
      'Entrega parcial: 2x Remera Subli T S Negro',
    );
  });

  it('ignora objetivos desconocidos', () => {
    expect(describeDeliveries([], [{ itemId: 'a', variationId: 'b', quantity: 1 }])).toBe('Entrega parcial');
  });
});
