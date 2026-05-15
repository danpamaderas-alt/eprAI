CREATE OR REPLACE FUNCTION process_sale_atomic(customer_id_param uuid, cart_items jsonb[], total_amount_param numeric)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  item_data jsonb;
  current_finished_quantity numeric;
  variant_id uuid;
  qty_to_deduct numeric;
  company_id_val uuid;
BEGIN
  -- Get company_id from the customer_id for RLS context, or pass it directly if preferred
  SELECT company_id INTO company_id_val FROM customers WHERE id = customer_id_param;
  IF company_id_val IS NULL THEN
    RAISE EXCEPTION 'Customer % not found or company_id not associated.', customer_id_param;
  END IF;

  FOR item_data IN SELECT * FROM jsonb_array_elements(cart_items)
  LOOP
    variant_id := (item_data->>'variantId')::uuid;
    qty_to_deduct := (item_data->>'qty')::numeric;

    -- Check current stock and apply RLS implicitly if company_id is present in product_variants
    SELECT finished_quantity INTO current_finished_quantity
    FROM product_variants
    WHERE id = variant_id;
    -- AND company_id = company_id_val; -- Uncomment if product_variants also have company_id

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Variant % not found', variant_id;
    END IF;

    IF current_finished_quantity < qty_to_deduct THEN
      RAISE EXCEPTION 'Insufficient stock for variant % (available: %, requested: %)', variant_id, current_finished_quantity, qty_to_deduct;
    END IF;

    UPDATE product_variants
    SET finished_quantity = finished_quantity - qty_to_deduct
    WHERE id = variant_id;
    -- AND company_id = company_id_val; -- Uncomment if product_variants also have company_id

    -- Opcional: Registrar cada item de la venta en una tabla de detalles de venta
    -- INSERT INTO sale_items (sale_id, variant_id, quantity, price, ...) VALUES (..., variant_id, qty_to_deduct, ...);

  END LOOP;

  -- Opcional: Registrar la venta principal
  -- INSERT INTO sales (customer_id, total_amount, company_id, ...) VALUES (customer_id_param, total_amount_param, company_id_val, ...);

  -- Opcional: Actualizar el balance del cliente (si registerPayment se maneja por separado o aquí)
  -- UPDATE customers
  -- SET balance = balance - total_amount_param
  -- WHERE id = customer_id_param AND company_id = company_id_val;

END;
$$;