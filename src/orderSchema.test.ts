import { describe, it, expect } from 'vitest';
import { orderSchema } from './modules/orders/schemas/orderSchema';

const validOrder = {
  customerName: 'Juan Pérez',
  businessUnit: 'RAICES' as const,
  status: 'PENDING' as const,
  dueDate: '2026-09-30',
  items: [
    {
      id: 'it-1',
      type: 'PRODUCT' as const,
      productName: 'Remera algodón',
      variations: [
        {
          id: 'v-1',
          size: 'L',
          color: 'Negro',
          quantityOrdered: 5,
          quantityDelivered: 0,
        },
      ],
    },
  ],
};

describe('orderSchema', () => {
  it('acepta un pedido válido', () => {
    expect(() => orderSchema.parse(validOrder)).not.toThrow();
  });

  it('rechaza sin nombre de cliente', () => {
    const bad = { ...validOrder, customerName: '  ' };
    const r = orderSchema.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it('rechaza con items vacíos (mínimo un artículo)', () => {
    const r = orderSchema.safeParse({ ...validOrder, items: [] });
    expect(r.success).toBe(false);
  });

  it('rechaza cantidad ordenada menor a 1', () => {
    const bad = structuredClone(validOrder) as typeof validOrder;
    bad.items[0].variations[0].quantityOrdered = 0;
    const r = orderSchema.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it('aplica defaults de totalAmount y advancePayment en 0', () => {
    const r = orderSchema.parse(validOrder);
    expect(r.totalAmount).toBe(0);
    expect(r.advancePayment).toBe(0);
  });

  it('rechaza unidad de negocio inválida', () => {
    const r = orderSchema.safeParse({ ...validOrder, businessUnit: 'NAZA' });
    expect(r.success).toBe(false);
  });
});
