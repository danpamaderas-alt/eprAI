CREATE OR REPLACE FUNCTION process_pos_sale_atomic(
  p_customer_id uuid,
  p_cart jsonb[],
  p_total numeric,
  p_payment_method text,
  p_company_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  new_sale_id uuid;
  item_data jsonb;
  variant_id uuid;
  qty numeric;
  current_finished numeric;
  caller_company_id uuid;
  variant_company_id uuid;
BEGIN
  SELECT company_id INTO caller_company_id FROM profiles WHERE id = auth.uid();
  IF caller_company_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: no company associated with your profile.';
  END IF;
  IF caller_company_id != p_company_id THEN
    RAISE EXCEPTION 'Access denied: company mismatch.';
  END IF;

  FOREACH item_data IN ARRAY p_cart
  LOOP
    variant_id := (item_data->>'variantId')::uuid;
    qty := (item_data->>'qty')::numeric;
    SELECT p.company_id INTO variant_company_id
    FROM product_variants pv JOIN products p ON p.id = pv.product_id WHERE pv.id = variant_id;
    IF variant_company_id IS NULL THEN RAISE EXCEPTION 'Variant % not found', variant_id; END IF;
    IF variant_company_id != caller_company_id THEN
      RAISE EXCEPTION 'Access denied: variant belongs to another company.';
    END IF;
    SELECT finished_quantity INTO current_finished FROM product_variants WHERE id = variant_id;
    IF current_finished < qty THEN
      RAISE EXCEPTION 'Insufficient stock for variant %', variant_id;
    END IF;
    UPDATE product_variants SET finished_quantity = finished_quantity - qty WHERE id = variant_id;
  END LOOP;

  new_sale_id := gen_random_uuid();
  INSERT INTO sales (id, company_id, customer_id, total, total_amount, payment_method, items, status, created_at)
  VALUES (new_sale_id, p_company_id, p_customer_id, p_total, p_total, p_payment_method, p_cart,
    CASE WHEN p_payment_method = 'CTA_CTE' THEN 'DEUDA' ELSE 'COBRADO' END, now());

  IF p_payment_method = 'CTA_CTE' AND p_customer_id IS NOT NULL THEN
    INSERT INTO account_movements (customer_id, company_id, amount, movement_type, description, created_at)
    VALUES (p_customer_id, p_company_id, p_total, 'CARGO',
      'Venta POS: ' || array_length(p_cart, 1) || ' prendas', now());
  END IF;

  RETURN new_sale_id;
END;
$fn$;
