-- =============================================
-- 004_apply_remote.sql
-- Aplicado al proyecto REAL: gjzvdepevoviygrcdwqj
-- ("caminosdelnorte84@gmail.com's Project", us-east-1)
--
-- Este proyecto ya tenía la mayoría de columnas y 6 de 11 RPCs.
-- Aplicado: tabla stock_movements, 5 columnas faltantes, vistas
-- financieras y 5 funciones RPC. Idempotente.
-- =============================================

-- 1. BITÁCORA DE STOCK (StockHistory)
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id),
  size_id uuid REFERENCES sizes(id),
  color_id uuid REFERENCES colors(id),
  quantity integer NOT NULL DEFAULT 0,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- 2. VISTA: Resumen de tesorería (FinancialDashboard)
CREATE OR REPLACE VIEW v_treasury_summary AS
SELECT
  COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME'), 0)  AS total_income,
  COALESCE(SUM(amount) FILTER (WHERE type = 'EXPENSE'), 0) AS total_expense,
  COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME'), 0)
    - COALESCE(SUM(amount) FILTER (WHERE type = 'EXPENSE'), 0) AS net_balance
FROM treasury;

-- 3. VISTA: Saldo por cliente (FinancialDashboard)
CREATE OR REPLACE VIEW v_customer_balances AS
SELECT
  c.id   AS customer_id,
  c.name AS customer_name,
  c.company_id,
  COALESCE(SUM(m.amount) FILTER (WHERE m.movement_type = 'CARGO'), 0) AS total_debt,
  COALESCE(SUM(m.amount) FILTER (WHERE m.movement_type = 'PAGO'), 0)   AS total_paid,
  COALESCE(SUM(m.amount) FILTER (WHERE m.movement_type = 'CARGO'), 0)
    - COALESCE(SUM(m.amount) FILTER (WHERE m.movement_type = 'PAGO'), 0) AS current_balance
FROM customers c
LEFT JOIN account_movements m ON m.customer_id = c.id
GROUP BY c.id, c.name, c.company_id;

-- 4. RPC: Venta atómica (useCatalogStore.processSale)
CREATE OR REPLACE FUNCTION process_sale_atomic(customer_id_param uuid, cart_items jsonb[], total_amount_param numeric)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  item_data jsonb;
  current_finished_quantity numeric;
  variant_id uuid;
  qty_to_deduct numeric;
  company_id_val uuid;
BEGIN
  SELECT company_id INTO company_id_val FROM customers WHERE id = customer_id_param;
  IF company_id_val IS NULL THEN
    RAISE EXCEPTION 'Customer % not found or company_id not associated.', customer_id_param;
  END IF;

  FOR item_data IN SELECT * FROM jsonb_array_elements(cart_items)
  LOOP
    variant_id := (item_data->>'variantId')::uuid;
    qty_to_deduct := (item_data->>'qty')::numeric;

    SELECT finished_quantity INTO current_finished_quantity
    FROM product_variants
    WHERE id = variant_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Variant % not found', variant_id;
    END IF;

    IF current_finished_quantity < qty_to_deduct THEN
      RAISE EXCEPTION 'Insufficient stock for variant % (available: %, requested: %)', variant_id, current_finished_quantity, qty_to_deduct;
    END IF;

    UPDATE product_variants
    SET finished_quantity = finished_quantity - qty_to_deduct
    WHERE id = variant_id;
  END LOOP;
END;
$$;

-- 5. RPC: Upsert de stock por variante (useCatalogStore.updateStock)
CREATE OR REPLACE FUNCTION upsert_stock(p_product_id uuid, p_size_id uuid, p_color_id uuid, p_quantity numeric)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM product_variants
    WHERE product_id = p_product_id AND size_id = p_size_id AND color_id = p_color_id
  ) THEN
    UPDATE product_variants
    SET stock_quantity = p_quantity
    WHERE product_id = p_product_id AND size_id = p_size_id AND color_id = p_color_id;
  ELSE
    INSERT INTO product_variants (product_id, size_id, color_id, stock_quantity)
    VALUES (p_product_id, p_size_id, p_color_id, p_quantity);
  END IF;
END;
$$;

-- 6. RPC: Transformar lisas -> terminadas (useCatalogStore.transformToFinished)
CREATE OR REPLACE FUNCTION transform_to_finished(p_variant_id uuid, p_quantity numeric)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_base numeric;
BEGIN
  SELECT COALESCE(base_quantity, 0) INTO v_base FROM product_variants WHERE id = p_variant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variante % no encontrada', p_variant_id;
  END IF;
  IF v_base < p_quantity THEN
    RAISE EXCEPTION 'No hay suficientes prendas lisas para esta operación.';
  END IF;

  UPDATE product_variants
  SET base_quantity = v_base - p_quantity,
      finished_quantity = COALESCE(finished_quantity, 0) + p_quantity
  WHERE id = p_variant_id;
END;
$$;

-- 7. RPC: Otorgar puntos (useCrmStore.awardLoyaltyPoints)
CREATE OR REPLACE FUNCTION award_loyalty_points(p_customer_id uuid, p_points integer, p_reason text, p_order_id uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE customers
  SET loyalty_points = COALESCE(loyalty_points, 0) + p_points
  WHERE id = p_customer_id;

  INSERT INTO loyalty_points_history (customer_id, order_id, points_change, reason)
  VALUES (p_customer_id, p_order_id, p_points, p_reason);
END;
$$;

-- 8. RPC: Canjear puntos (useCrmStore.redeemLoyaltyPoints)
CREATE OR REPLACE FUNCTION redeem_loyalty_points(p_customer_id uuid, p_points integer, p_reason text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE customers
  SET loyalty_points = GREATEST(COALESCE(loyalty_points, 0) - p_points, 0)
  WHERE id = p_customer_id;

  INSERT INTO loyalty_points_history (customer_id, points_change, reason)
  VALUES (p_customer_id, -p_points, p_reason);
END;
$$;

-- 9. COLUMNAS FALTANTES (detectadas vía REST probe 2026-08-15)
ALTER TABLE services ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS items jsonb;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS business_unit text;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS total numeric;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS date timestamptz;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS items jsonb;
