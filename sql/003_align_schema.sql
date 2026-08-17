-- =============================================
-- 003_align_schema.sql
-- Alinea el esquema real de Supabase con el código de la app.
-- Ejecutar en el SQL Editor de Supabase (proyecto xyxkqvbdybnilunvuoqb).
-- Es idempotente: se puede correr varias veces sin romper nada.
--
-- Contenido:
--   1. Columnas faltantes en tablas existentes
--   2. Tablas faltantes (suppliers, raw_materials, deals, inventory,
--      loyalty_points_history, stock_movements, deliveries, clients)
--   3. Vistas financieras (v_treasury_summary, v_customer_balances)
--   4. Columnas de companies (contenido de 002_expand_companies.sql)
--   5. Funciones RPC que la app invoca
-- =============================================

-- =============================================
-- 1. COLUMNAS FALTANTES EN TABLAS EXISTENTES
-- =============================================

-- customers (CRM / fidelización / portal)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS loyalty_points integer DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS portal_access boolean DEFAULT false;

-- products (catálogo, POS, valorización de stock)
ALTER TABLE products ADD COLUMN IF NOT EXISTS price numeric DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost numeric DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS location text;

-- services
ALTER TABLE services ADD COLUMN IF NOT EXISTS description text;

-- treasury (tesorería: categoría y estado de cada movimiento)
ALTER TABLE treasury ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE treasury ADD COLUMN IF NOT EXISTS status text DEFAULT 'COMPLETADO';

-- personalization_types (precio base de personalización)
ALTER TABLE personalization_types ADD COLUMN IF NOT EXISTS base_price numeric DEFAULT 0;

-- niches (aislamiento multi-tenant)
ALTER TABLE niches ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);

-- reseller_transactions
ALTER TABLE reseller_transactions ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- =============================================
-- 2. TABLAS FALTANTES
-- =============================================

-- Proveedores (useSupplierStore)
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact text,
  phone text,
  balance numeric DEFAULT 0,
  company_id uuid REFERENCES companies(id),
  created_at timestamptz DEFAULT now()
);

-- Materia prima / insumos (useRawMaterialStore)
CREATE TABLE IF NOT EXISTS raw_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  color text,
  brand text,
  supplier_code text,
  image_url text,
  unit_measure text,
  stock_quantity numeric DEFAULT 0,
  min_stock_alert numeric DEFAULT 0,
  company_id uuid REFERENCES companies(id),
  created_at timestamptz DEFAULT now()
);

-- Oportunidades comerciales / embudo CRM (CrmDashboard)
CREATE TABLE IF NOT EXISTS deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES customers(id),
  title text NOT NULL,
  status text DEFAULT 'NUEVO',
  expected_revenue numeric DEFAULT 0,
  notes text,
  company_id uuid REFERENCES companies(id),
  created_at timestamptz DEFAULT now()
);

-- Inventario de prendas lisas (useInventoryStore)
CREATE TABLE IF NOT EXISTS inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  base_stock_qty integer DEFAULT 0,
  reserved_stock_qty integer DEFAULT 0,
  finished_stock_qty integer DEFAULT 0,
  company_id uuid REFERENCES companies(id),
  created_at timestamptz DEFAULT now()
);

-- Historial de puntos de fidelización (CustomerCRM + RPCs)
CREATE TABLE IF NOT EXISTS loyalty_points_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id),
  order_id uuid REFERENCES orders(id),
  points_change integer NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Bitácora de movimientos de stock (StockHistory)
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id),
  size_id uuid REFERENCES sizes(id),
  color_id uuid REFERENCES colors(id),
  quantity integer NOT NULL DEFAULT 0,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- Entregas parciales (solo referenciada por 001_enable_rls.sql)
CREATE TABLE IF NOT EXISTS deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id),
  company_id uuid REFERENCES companies(id),
  description text,
  status text DEFAULT 'PARCIAL',
  created_at timestamptz DEFAULT now()
);

-- Clientes alternativos (solo referenciada por 001_enable_rls.sql)
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text DEFAULT 'B2C',
  phone text,
  email text,
  notes text,
  company_id uuid REFERENCES companies(id),
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- 3. VISTAS FINANCIERAS (FinancialDashboard)
-- =============================================

-- Resumen de tesorería (una sola fila: totales globales)
CREATE OR REPLACE VIEW v_treasury_summary AS
SELECT
  COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME'), 0)  AS total_income,
  COALESCE(SUM(amount) FILTER (WHERE type = 'EXPENSE'), 0) AS total_expense,
  COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME'), 0)
    - COALESCE(SUM(amount) FILTER (WHERE type = 'EXPENSE'), 0) AS net_balance
FROM treasury;

-- Saldo por cliente: deuda (CARGO) menos pagos (PAGO) de account_movements
CREATE OR REPLACE VIEW v_customer_balances AS
SELECT
  c.id                                                       AS customer_id,
  c.name                                                     AS customer_name,
  c.company_id,
  COALESCE(SUM(m.amount) FILTER (WHERE m.movement_type = 'CARGO'), 0) AS total_debt,
  COALESCE(SUM(m.amount) FILTER (WHERE m.movement_type = 'PAGO'), 0)   AS total_paid,
  COALESCE(SUM(m.amount) FILTER (WHERE m.movement_type = 'CARGO'), 0)
    - COALESCE(SUM(m.amount) FILTER (WHERE m.movement_type = 'PAGO'), 0) AS current_balance
FROM customers c
LEFT JOIN account_movements m ON m.customer_id = c.id
GROUP BY c.id, c.name, c.company_id;

-- =============================================
-- 4. EMPRESAS (contenido de 002_expand_companies.sql)
-- =============================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS fiscal_condition text DEFAULT 'RI'
  CHECK (fiscal_condition IN ('RI', 'MONOTRIBUTO', 'EXENTO', 'CF'));

ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS province text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS postal_code text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS default_currency text DEFAULT 'ARS';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS notes text;

-- =============================================
-- 5. FUNCIONES RPC QUE LA APP INVOCA
-- =============================================

-- Pedido atómico: crea la orden y descuenta stock por variante
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
  INSERT INTO orders (
    customer_name, total_amount, advance_payment,
    status, due_date, business_unit, items, company_id
  )
  VALUES (
    order_payload->>'customer_name',
    (order_payload->>'total_amount')::NUMERIC,
    (order_payload->>'advance_payment')::NUMERIC,
    order_payload->>'status',
    (order_payload->>'due_date')::TIMESTAMP,
    order_payload->>'business_unit',
    order_payload->'items',
    (order_payload->>'company_id')::UUID
  )
  RETURNING id INTO v_new_order_id;

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

  RETURN jsonb_build_object('success', true, 'order_id', v_new_order_id);
END;
$$;

-- Venta atómica: descuenta stock terminado por variante
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

-- Actualizar stock de una variante (o todas las de un producto)
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

-- Eliminar una variante de producto
CREATE OR REPLACE FUNCTION delete_product_variation(p_product_id UUID, p_variation_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM product_variants WHERE id = p_variation_id AND product_id = p_product_id;
END;
$$;

-- Registrar entrega parcial de una orden
CREATE OR REPLACE FUNCTION register_partial_delivery(p_order_id UUID, p_delivery_data JSONB)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE orders SET status = COALESCE(p_delivery_data->>'status', 'PARCIAL') WHERE id = p_order_id;
END;
$$;

-- Reservar stock liso (base -> stock disponible)
CREATE OR REPLACE FUNCTION reserve_inventory_stock(p_variant_id UUID, p_quantity NUMERIC)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE product_variants
  SET base_quantity = COALESCE(base_quantity, 0) - p_quantity,
      stock_quantity = COALESCE(stock_quantity, 0) + p_quantity
  WHERE id = p_variant_id;
END;
$$;

-- Pasar stock disponible a terminado (personalización)
CREATE OR REPLACE FUNCTION process_personalization_atomic(p_variant_id UUID, p_quantity NUMERIC)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE product_variants
  SET stock_quantity = COALESCE(stock_quantity, 0) - p_quantity,
      finished_quantity = COALESCE(finished_quantity, 0) + p_quantity
  WHERE id = p_variant_id;
END;
$$;

-- Upsert de stock de una variante (useCatalogStore.updateStock)
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

-- Transformar prendas lisas en terminadas (useCatalogStore.transformToFinished)
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

-- Otorgar puntos de fidelización (useCrmStore.awardLoyaltyPoints)
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

-- Canjear puntos de fidelización (useCrmStore.redeemLoyaltyPoints)
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
