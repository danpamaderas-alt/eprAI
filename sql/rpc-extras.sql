
CREATE OR REPLACE FUNCTION update_product_stock_atomic(p_product_id UUID, p_new_stock NUMERIC, p_variation_id UUID DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF p_variation_id IS NOT NULL THEN
    UPDATE product_variants SET stock_quantity = p_new_stock WHERE id = p_variation_id;
  ELSE
    UPDATE product_variants SET stock_quantity = p_new_stock WHERE product_id = p_product_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION delete_product_variation(p_product_id UUID, p_variation_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM product_variants WHERE id = p_variation_id AND product_id = p_product_id;
END;
$$;

CREATE OR REPLACE FUNCTION register_partial_delivery(p_order_id UUID, p_delivery_data JSONB)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE orders SET status = COALESCE(p_delivery_data->>'status', 'PARCIAL') WHERE id = p_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION reserve_inventory_stock(p_variant_id UUID, p_quantity NUMERIC)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE product_variants 
  SET base_quantity = COALESCE(base_quantity, 0) - p_quantity, 
      stock_quantity = COALESCE(stock_quantity, 0) + p_quantity
  WHERE id = p_variant_id;
END;
$$;

CREATE OR REPLACE FUNCTION process_personalization_atomic(p_variant_id UUID, p_quantity NUMERIC)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE product_variants 
  SET stock_quantity = COALESCE(stock_quantity, 0) - p_quantity, 
      finished_quantity = COALESCE(finished_quantity, 0) + p_quantity
  WHERE id = p_variant_id;
END;
$$;
