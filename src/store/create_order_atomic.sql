-- Función atómica para crear un pedido y descontar el stock simultáneamente.
-- Se ejecuta dentro de una sola transacción, si algo falla, se revierte todo.

CREATE OR REPLACE FUNCTION create_order_atomic(order_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_order_id UUID;
  v_item JSONB;
  v_variant JSONB;
  v_product_id UUID;
BEGIN
  -- 1. Insertamos el pedido mapeando los campos del JSON a la tabla orders
  INSERT INTO orders (
    customer_name, total_amount, advance_payment, 
    status, due_date, business_unit, items
  )
  VALUES (
    order_payload->>'customer_name',
    (order_payload->>'total_amount')::NUMERIC,
    (order_payload->>'advance_payment')::NUMERIC,
    order_payload->>'status',
    (order_payload->>'due_date')::TIMESTAMP,
    order_payload->>'business_unit',
    order_payload->'items'
  )
  RETURNING id INTO v_new_order_id;

  -- 2. Recorremos los ítems del JSON y descontamos el stock atómicamente
  FOR v_item IN SELECT * FROM jsonb_array_elements(order_payload->'items') LOOP
    v_product_id := COALESCE(v_item->>'productId', v_item->>'id')::UUID;
    
    FOR v_variant IN SELECT * FROM jsonb_array_elements(v_item->'variations') LOOP
      UPDATE product_variants
      SET stock_quantity = stock_quantity - (v_variant->>'quantity')::INT
      WHERE product_id = v_product_id
        AND size_id = (v_variant->>'sizeId')::UUID
        AND color_id = (v_variant->>'colorId')::UUID;
    END LOOP;
  END LOOP;

  -- 3. Retornamos el ID del pedido recién creado
  RETURN jsonb_build_object('success', true, 'order_id', v_new_order_id);
END;
$$;