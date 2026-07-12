-- Fix Missing Columns in treasury
ALTER TABLE treasury 
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS business_unit TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'COMPLETADO';

-- Fix Missing Columns in profiles (required for login/tenant resolution)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Fix Missing Tables
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS business_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS personalization_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  name TEXT NOT NULL,
  price NUMERIC DEFAULT 0
);

-- Aseguramos que existan las columnas por si la tabla ya había sido creada antes con otro esquema
ALTER TABLE personalization_types ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE personalization_types ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;

CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  name TEXT NOT NULL,
  price NUMERIC DEFAULT 0,
  description TEXT
);

ALTER TABLE services ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE services ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact TEXT,
  phone TEXT,
  balance NUMERIC DEFAULT 0
);

-- Missing Views
CREATE OR REPLACE VIEW v_treasury_summary AS
SELECT 
  SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) as total_income,
  SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as total_expense,
  SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) - SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as net_balance
FROM treasury;

CREATE OR REPLACE VIEW v_customer_balances AS
SELECT id as customer_id, balance as current_balance
FROM customers;

-- Add foreign keys for product_variants if missing
-- First, add missing columns to product_variants
ALTER TABLE product_variants
ADD COLUMN IF NOT EXISTS size_id UUID,
ADD COLUMN IF NOT EXISTS color_id UUID;

-- Agregamos las Constraints de forma segura (evita errores si ya existen)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_size') THEN
    ALTER TABLE product_variants ADD CONSTRAINT fk_size FOREIGN KEY (size_id) REFERENCES sizes(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_color') THEN
    ALTER TABLE product_variants ADD CONSTRAINT fk_color FOREIGN KEY (color_id) REFERENCES colors(id) ON DELETE SET NULL;
  END IF;
END;
$$;

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
    
    -- COALESCE asegura que si es un servicio sin variaciones, no lance un error
    FOR v_variant IN SELECT * FROM jsonb_array_elements(COALESCE(v_item->'variations', '[]'::jsonb)) LOOP
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


CREATE OR REPLACE FUNCTION process_sale_atomic(customer_id_param uuid, cart_items jsonb[], total_amount_param numeric)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  item_data jsonb;
  current_finished_quantity numeric;
  variant_id uuid;
  qty_to_deduct numeric;
  company_id_val uuid;
  new_sale_id uuid;
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

  INSERT INTO sales (company_id, customer_id, total_amount, status)
  VALUES (company_id_val, customer_id_param, total_amount_param, 'COMPLETADO')
  RETURNING id INTO new_sale_id;

  UPDATE customers
  SET balance = COALESCE(balance, 0) - total_amount_param
  WHERE id = customer_id_param AND company_id = company_id_val;

END;
$$;


-- Atomic loyalty points functions
CREATE OR REPLACE FUNCTION award_loyalty_points(p_customer_id UUID, p_points NUMERIC, p_reason TEXT, p_order_id UUID DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE customers SET loyalty_points = COALESCE(loyalty_points, 0) + p_points WHERE id = p_customer_id;
  INSERT INTO loyalty_points_history (customer_id, points_change, reason, order_id)
  VALUES (p_customer_id, p_points, p_reason, p_order_id);
END;
$$;

CREATE OR REPLACE FUNCTION redeem_loyalty_points(p_customer_id UUID, p_points NUMERIC, p_reason TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  current_points NUMERIC;
BEGIN
  SELECT COALESCE(loyalty_points, 0) INTO current_points FROM customers WHERE id = p_customer_id;
  IF current_points < p_points THEN
    RAISE EXCEPTION 'Puntos insuficientes: disponibles %, solicitados %', current_points, p_points;
  END IF;
  UPDATE customers SET loyalty_points = current_points - p_points WHERE id = p_customer_id;
  INSERT INTO loyalty_points_history (customer_id, points_change, reason, order_id)
  VALUES (p_customer_id, -p_points, p_reason, NULL);
END;
$$;

-- 1. update_product_stock_atomic
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

-- 2. delete_product_variation
CREATE OR REPLACE FUNCTION delete_product_variation(p_product_id UUID, p_variation_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM product_variants WHERE id = p_variation_id AND product_id = p_product_id;
END;
$$;

-- 3. register_partial_delivery
CREATE OR REPLACE FUNCTION register_partial_delivery(p_order_id UUID, p_delivery_data JSONB)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE orders SET status = COALESCE(p_delivery_data->>'status', 'PARCIAL') WHERE id = p_order_id;
END;
$$;

-- 4. reserve_inventory_stock
CREATE OR REPLACE FUNCTION reserve_inventory_stock(p_variant_id UUID, p_quantity NUMERIC)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE product_variants 
  SET base_quantity = base_quantity - p_quantity, 
      stock_quantity = COALESCE(stock_quantity, 0) + p_quantity
  WHERE id = p_variant_id;
END;
$$;

-- 5. process_personalization_atomic
CREATE OR REPLACE FUNCTION process_personalization_atomic(p_variant_id UUID, p_quantity NUMERIC)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE product_variants 
  SET stock_quantity = stock_quantity - p_quantity, 
      finished_quantity = COALESCE(finished_quantity, 0) + p_quantity
  WHERE id = p_variant_id;
END;
$$;



-- Missing Application Tables
CREATE TABLE IF NOT EXISTS raw_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  name TEXT NOT NULL,
  unit TEXT,
  cost NUMERIC DEFAULT 0,
  current_stock NUMERIC DEFAULT 0,
  minimum_stock NUMERIC DEFAULT 0,
  supplier_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  customer_id UUID,
  total_amount NUMERIC DEFAULT 0,
  payment_method TEXT,
  status TEXT DEFAULT 'COMPLETADO',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  order_id UUID,
  address TEXT,
  status TEXT DEFAULT 'PENDIENTE',
  delivery_date TIMESTAMP WITH TIME ZONE,
  driver_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT,
  status TEXT DEFAULT 'OPEN',
  amount NUMERIC DEFAULT 0,
  expected_close_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  name TEXT NOT NULL,
  phone TEXT,
  balance NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reseller_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resellerId UUID REFERENCES resellers(id) ON DELETE CASCADE,
  type TEXT,
  description TEXT,
  amount NUMERIC DEFAULT 0,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  customer_id UUID,
  total_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'PENDIENTE',
  valid_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
  variant_id UUID,
  quantity NUMERIC DEFAULT 1,
  price NUMERIC DEFAULT 0
);
