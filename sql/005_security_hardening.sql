-- =============================================
-- 005_security_hardening.sql (CORREGIDO)
-- FASE 1: Seguridad - RLS + RPC hardening
-- Proyecto: gjzvdepevoviygrcdwqj
-- =============================================

-- =============================================
-- 1. RLS EN stock_movements (la unica sin RLS)
-- =============================================
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 2. POLICIES PARA TABLAS CON company_id
-- =============================================

-- expenses
DROP POLICY IF EXISTS "tenant_isolation" ON expenses;
CREATE POLICY "tenant_isolation" ON expenses
  FOR ALL USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- packaging_supplies
DROP POLICY IF EXISTS "tenant_isolation" ON packaging_supplies;
CREATE POLICY "tenant_isolation" ON packaging_supplies
  FOR ALL USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- supplier_debts
DROP POLICY IF EXISTS "tenant_isolation" ON supplier_debts;
CREATE POLICY "tenant_isolation" ON supplier_debts
  FOR ALL USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- =============================================
-- 3. POLICIES PARA TABLAS CON company_id (ya tienen policy pero 0 policies = bloqueado)
-- Agregamos policies donde faltan
-- =============================================

-- client_movements: join via customer_id -> customers.company_id
DROP POLICY IF EXISTS "tenant_isolation" ON client_movements;
CREATE POLICY "tenant_isolation" ON client_movements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = client_movements.customer_id
      AND c.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

-- client_gifts: join via customer_id -> customers.company_id
DROP POLICY IF EXISTS "tenant_isolation" ON client_gifts;
CREATE POLICY "tenant_isolation" ON client_gifts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = client_gifts.customer_id
      AND c.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

-- custom_orders: join via customer_id -> customers.company_id
DROP POLICY IF EXISTS "tenant_isolation" ON custom_orders;
CREATE POLICY "tenant_isolation" ON custom_orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = custom_orders.customer_id
      AND c.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

-- customer_debts: join via customer_id -> customers.company_id
DROP POLICY IF EXISTS "tenant_isolation" ON customer_debts;
CREATE POLICY "tenant_isolation" ON customer_debts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_debts.customer_id
      AND c.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

-- debt_payments: join via debt_id -> customer_debts (via customer)
DROP POLICY IF EXISTS "tenant_isolation" ON debt_payments;
CREATE POLICY "tenant_isolation" ON debt_payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customer_debts cd
      JOIN customers c ON c.id = cd.customer_id
      WHERE cd.id = debt_payments.debt_id
      AND c.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

-- movement_audit_log: no company_id directo, permitir lectura global
DROP POLICY IF EXISTS "tenant_isolation" ON movement_audit_log;
CREATE POLICY "tenant_isolation" ON movement_audit_log
  FOR ALL USING (true);

-- portal_users: join via customer_id -> customers.company_id
DROP POLICY IF EXISTS "tenant_isolation" ON portal_users;
CREATE POLICY "tenant_isolation" ON portal_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = portal_users.customer_id
      AND c.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

-- transactions: join via customer_id -> customers.company_id
DROP POLICY IF EXISTS "tenant_isolation" ON transactions;
CREATE POLICY "tenant_isolation" ON transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = transactions.customer_id
      AND c.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

-- order_items: join via order_id -> orders.company_id
DROP POLICY IF EXISTS "tenant_isolation" ON order_items;
CREATE POLICY "tenant_isolation" ON order_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
      AND o.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

-- product_variants: join via product_id -> products.company_id
DROP POLICY IF EXISTS "tenant_isolation" ON product_variants;
CREATE POLICY "tenant_isolation" ON product_variants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_variants.product_id
      AND p.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

-- loyalty_points_history: join via customer_id -> customers.company_id
DROP POLICY IF EXISTS "tenant_isolation" ON loyalty_points_history;
CREATE POLICY "tenant_isolation" ON loyalty_points_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = loyalty_points_history.customer_id
      AND c.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

-- quote_items: join via quote_id -> quotes.company_id
DROP POLICY IF EXISTS "tenant_isolation" ON quote_items;
CREATE POLICY "tenant_isolation" ON quote_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM quotes q
      WHERE q.id = quote_items.quote_id
      AND q.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

-- reseller_transactions: join via resellerId -> resellers.company_id
DROP POLICY IF EXISTS "tenant_isolation" ON reseller_transactions;
CREATE POLICY "tenant_isolation" ON reseller_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM resellers r
      WHERE r.id = reseller_transactions."resellerId"
      AND r.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

-- stock_movements: join via product_id -> products.company_id
DROP POLICY IF EXISTS "tenant_isolation" ON stock_movements;
CREATE POLICY "tenant_isolation" ON stock_movements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = stock_movements.product_id
      AND p.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

-- inventory: join via product_id -> products.company_id
DROP POLICY IF EXISTS "tenant_isolation" ON inventory;
CREATE POLICY "tenant_isolation" ON inventory
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = inventory.product_id
      AND p.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

-- product_recipes: join via product_id -> products.company_id
DROP POLICY IF EXISTS "tenant_isolation" ON product_recipes;
CREATE POLICY "tenant_isolation" ON product_recipes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_recipes.product_id
      AND p.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Tablas sin company_id ni joins relevantes: acceso global
DROP POLICY IF EXISTS "tenant_isolation" ON deportiva_inventario;
CREATE POLICY "tenant_isolation" ON deportiva_inventario FOR ALL USING (true);

DROP POLICY IF EXISTS "tenant_isolation" ON inventario_central;
CREATE POLICY "tenant_isolation" ON inventario_central FOR ALL USING (true);

DROP POLICY IF EXISTS "tenant_isolation" ON productos_3d;
CREATE POLICY "tenant_isolation" ON productos_3d FOR ALL USING (true);

DROP POLICY IF EXISTS "tenant_isolation" ON productos_textil;
CREATE POLICY "tenant_isolation" ON productos_textil FOR ALL USING (true);

DROP POLICY IF EXISTS "tenant_isolation" ON "3d_materials_stock";
CREATE POLICY "tenant_isolation" ON "3d_materials_stock" FOR ALL USING (true);

DROP POLICY IF EXISTS "tenant_isolation" ON collections;
CREATE POLICY "tenant_isolation" ON collections FOR ALL USING (true);

-- =============================================
-- 4. HARDENING DE RPCs (SECURITY DEFINER + tenant check)
-- =============================================

CREATE OR REPLACE FUNCTION process_sale_atomic(
  customer_id_param uuid, cart_items jsonb[], total_amount_param numeric
)
RETURNS void LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE
  item_data jsonb; current_finished_quantity numeric;
  variant_id uuid; qty_to_deduct numeric;
  caller_company_id uuid; variant_company_id uuid;
BEGIN
  SELECT company_id INTO caller_company_id FROM profiles WHERE id = auth.uid();
  IF caller_company_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: no company associated with your profile.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM customers WHERE id = customer_id_param AND company_id = caller_company_id) THEN
    RAISE EXCEPTION 'Customer does not belong to your company.';
  END IF;
  FOR item_data IN SELECT * FROM jsonb_array_elements(cart_items)
  LOOP
    variant_id := (item_data->>'variantId')::uuid;
    qty_to_deduct := (item_data->>'qty')::numeric;
    SELECT p.company_id INTO variant_company_id
    FROM product_variants pv JOIN products p ON p.id = pv.product_id WHERE pv.id = variant_id;
    IF variant_company_id IS NULL THEN RAISE EXCEPTION 'Variant % not found', variant_id; END IF;
    IF variant_company_id != caller_company_id THEN
      RAISE EXCEPTION 'Access denied: variant belongs to another company.';
    END IF;
    SELECT finished_quantity INTO current_finished_quantity FROM product_variants WHERE id = variant_id;
    IF current_finished_quantity < qty_to_deduct THEN
      RAISE EXCEPTION 'Insufficient stock for variant % (available: %, requested: %)',
        variant_id, current_finished_quantity, qty_to_deduct;
    END IF;
    UPDATE product_variants SET finished_quantity = finished_quantity - qty_to_deduct WHERE id = variant_id;
  END LOOP;
END; $$;

CREATE OR REPLACE FUNCTION create_order_atomic(p_order jsonb, p_items jsonb[])
RETURNS uuid LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE
  new_order_id uuid; caller_company_id uuid; item_data jsonb;
  v_product_id uuid; v_qty numeric;
BEGIN
  SELECT company_id INTO caller_company_id FROM profiles WHERE id = auth.uid();
  IF caller_company_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: no company associated with your profile.';
  END IF;
  new_order_id := gen_random_uuid();
  INSERT INTO orders (id, company_id, customer_name, customer_id, status,
    advance_payment, due_date, business_unit, items, created_at)
  VALUES (new_order_id, caller_company_id, p_order->>'customer_name',
    (p_order->>'customer_id')::uuid, COALESCE(p_order->>'status', 'PENDIENTE'),
    COALESCE((p_order->>'advance_payment')::numeric, 0),
    (p_order->>'due_date')::timestamptz, p_order->>'business_unit', p_order->'items', now());
  FOREACH item_data IN ARRAY p_items
  LOOP
    v_product_id := (item_data->>'product_id')::uuid;
    v_qty := (item_data->>'quantity')::numeric;
    INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
    VALUES (new_order_id, v_product_id, v_qty,
      COALESCE((item_data->>'unit_price')::numeric, 0),
      COALESCE((item_data->>'subtotal')::numeric, v_qty * COALESCE((item_data->>'unit_price')::numeric, 0)));
  END LOOP;
  RETURN new_order_id;
END; $$;

CREATE OR REPLACE FUNCTION update_product_stock_atomic(p_variant_id uuid, p_field text, p_delta numeric)
RETURNS void LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE
  caller_company_id uuid; variant_company_id uuid;
BEGIN
  SELECT company_id INTO caller_company_id FROM profiles WHERE id = auth.uid();
  IF caller_company_id IS NULL THEN RAISE EXCEPTION 'Access denied: no company associated with your profile.'; END IF;
  SELECT p.company_id INTO variant_company_id
  FROM product_variants pv JOIN products p ON p.id = pv.product_id WHERE pv.id = p_variant_id;
  IF variant_company_id IS NULL THEN RAISE EXCEPTION 'Variant not found.'; END IF;
  IF variant_company_id != caller_company_id THEN
    RAISE EXCEPTION 'Access denied: variant belongs to another company.';
  END IF;
  IF p_field = 'stock_quantity' THEN
    UPDATE product_variants SET stock_quantity = GREATEST(COALESCE(stock_quantity, 0) + p_delta, 0) WHERE id = p_variant_id;
  ELSIF p_field = 'base_quantity' THEN
    UPDATE product_variants SET base_quantity = GREATEST(COALESCE(base_quantity, 0) + p_delta, 0) WHERE id = p_variant_id;
  ELSIF p_field = 'finished_quantity' THEN
    UPDATE product_variants SET finished_quantity = GREATEST(COALESCE(finished_quantity, 0) + p_delta, 0) WHERE id = p_variant_id;
  ELSE RAISE EXCEPTION 'Invalid field: %', p_field;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION delete_product_variation(p_variant_id uuid)
RETURNS void LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE caller_company_id uuid; variant_company_id uuid;
BEGIN
  SELECT company_id INTO caller_company_id FROM profiles WHERE id = auth.uid();
  IF caller_company_id IS NULL THEN RAISE EXCEPTION 'Access denied: no company associated with your profile.'; END IF;
  SELECT p.company_id INTO variant_company_id
  FROM product_variants pv JOIN products p ON p.id = pv.product_id WHERE pv.id = p_variant_id;
  IF variant_company_id IS NULL THEN RAISE EXCEPTION 'Variant not found.'; END IF;
  IF variant_company_id != caller_company_id THEN
    RAISE EXCEPTION 'Access denied: variant belongs to another company.';
  END IF;
  DELETE FROM product_variants WHERE id = p_variant_id;
END; $$;

CREATE OR REPLACE FUNCTION upsert_stock(p_product_id uuid, p_size_id uuid, p_color_id uuid, p_quantity numeric)
RETURNS void LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE caller_company_id uuid; product_company_id uuid;
BEGIN
  SELECT company_id INTO caller_company_id FROM profiles WHERE id = auth.uid();
  IF caller_company_id IS NULL THEN RAISE EXCEPTION 'Access denied: no company associated with your profile.'; END IF;
  SELECT company_id INTO product_company_id FROM products WHERE id = p_product_id;
  IF product_company_id IS NULL THEN RAISE EXCEPTION 'Product not found.'; END IF;
  IF product_company_id != caller_company_id THEN
    RAISE EXCEPTION 'Access denied: product belongs to another company.';
  END IF;
  IF EXISTS (SELECT 1 FROM product_variants WHERE product_id = p_product_id AND size_id = p_size_id AND color_id = p_color_id) THEN
    UPDATE product_variants SET stock_quantity = p_quantity
    WHERE product_id = p_product_id AND size_id = p_size_id AND color_id = p_color_id;
  ELSE
    INSERT INTO product_variants (product_id, size_id, color_id, stock_quantity)
    VALUES (p_product_id, p_size_id, p_color_id, p_quantity);
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION transform_to_finished(p_variant_id uuid, p_quantity numeric)
RETURNS void LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE v_base numeric; caller_company_id uuid; variant_company_id uuid;
BEGIN
  SELECT company_id INTO caller_company_id FROM profiles WHERE id = auth.uid();
  IF caller_company_id IS NULL THEN RAISE EXCEPTION 'Access denied: no company associated with your profile.'; END IF;
  SELECT p.company_id INTO variant_company_id
  FROM product_variants pv JOIN products p ON p.id = pv.product_id WHERE pv.id = p_variant_id;
  IF variant_company_id IS NULL THEN RAISE EXCEPTION 'Variante % no encontrada', p_variant_id; END IF;
  IF variant_company_id != caller_company_id THEN
    RAISE EXCEPTION 'Access denied: variant belongs to another company.';
  END IF;
  SELECT COALESCE(base_quantity, 0) INTO v_base FROM product_variants WHERE id = p_variant_id;
  IF v_base < p_quantity THEN
    RAISE EXCEPTION 'No hay suficientes prendas lisas para esta operacion.';
  END IF;
  UPDATE product_variants
  SET base_quantity = v_base - p_quantity, finished_quantity = COALESCE(finished_quantity, 0) + p_quantity
  WHERE id = p_variant_id;
END; $$;

CREATE OR REPLACE FUNCTION register_partial_delivery(
  p_order_id uuid, p_quantity numeric, p_items_delivered jsonb DEFAULT NULL, p_notes text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE caller_company_id uuid; order_company_id uuid;
BEGIN
  SELECT company_id INTO caller_company_id FROM profiles WHERE id = auth.uid();
  IF caller_company_id IS NULL THEN RAISE EXCEPTION 'Access denied: no company associated with your profile.'; END IF;
  SELECT company_id INTO order_company_id FROM orders WHERE id = p_order_id;
  IF order_company_id IS NULL THEN RAISE EXCEPTION 'Order not found.'; END IF;
  IF order_company_id != caller_company_id THEN
    RAISE EXCEPTION 'Access denied: order belongs to another company.';
  END IF;
  INSERT INTO deliveries (order_id, quantity, items_delivered, notes, delivered_at)
  VALUES (p_order_id, p_quantity, p_items_delivered, p_notes, now());
END; $$;

CREATE OR REPLACE FUNCTION reserve_inventory_stock(p_variant_id uuid, p_quantity numeric)
RETURNS void LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE caller_company_id uuid; variant_company_id uuid; current_finished numeric;
BEGIN
  SELECT company_id INTO caller_company_id FROM profiles WHERE id = auth.uid();
  IF caller_company_id IS NULL THEN RAISE EXCEPTION 'Access denied: no company associated with your profile.'; END IF;
  SELECT p.company_id INTO variant_company_id
  FROM product_variants pv JOIN products p ON p.id = pv.product_id WHERE pv.id = p_variant_id;
  IF variant_company_id IS NULL THEN RAISE EXCEPTION 'Variant not found.'; END IF;
  IF variant_company_id != caller_company_id THEN
    RAISE EXCEPTION 'Access denied: variant belongs to another company.';
  END IF;
  SELECT finished_quantity INTO current_finished FROM product_variants WHERE id = p_variant_id;
  IF current_finished < p_quantity THEN
    RAISE EXCEPTION 'Insufficient finished stock for reservation.';
  END IF;
  UPDATE product_variants SET finished_quantity = finished_quantity - p_quantity WHERE id = p_variant_id;
END; $$;

CREATE OR REPLACE FUNCTION process_personalization_atomic(p_order_id uuid, p_personalizations jsonb[])
RETURNS void LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE caller_company_id uuid; order_company_id uuid; pers_data jsonb;
BEGIN
  SELECT company_id INTO caller_company_id FROM profiles WHERE id = auth.uid();
  IF caller_company_id IS NULL THEN RAISE EXCEPTION 'Access denied: no company associated with your profile.'; END IF;
  SELECT company_id INTO order_company_id FROM orders WHERE id = p_order_id;
  IF order_company_id IS NULL THEN RAISE EXCEPTION 'Order not found.'; END IF;
  IF order_company_id != caller_company_id THEN
    RAISE EXCEPTION 'Access denied: order belongs to another company.';
  END IF;
  FOREACH pers_data IN ARRAY p_personalizations
  LOOP
    INSERT INTO custom_orders (order_id, type_id, description, price, status)
    VALUES (p_order_id, (pers_data->>'type_id')::uuid, pers_data->>'description', (pers_data->>'price')::numeric, 'PENDIENTE');
  END LOOP;
END; $$;

CREATE OR REPLACE FUNCTION award_loyalty_points(
  p_customer_id uuid, p_points integer, p_reason text, p_order_id uuid DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE caller_company_id uuid; customer_company_id uuid;
BEGIN
  SELECT company_id INTO caller_company_id FROM profiles WHERE id = auth.uid();
  IF caller_company_id IS NULL THEN RAISE EXCEPTION 'Access denied: no company associated with your profile.'; END IF;
  SELECT company_id INTO customer_company_id FROM customers WHERE id = p_customer_id;
  IF customer_company_id IS NULL THEN RAISE EXCEPTION 'Customer not found.'; END IF;
  IF customer_company_id != caller_company_id THEN
    RAISE EXCEPTION 'Access denied: customer belongs to another company.';
  END IF;
  UPDATE customers SET loyalty_points = COALESCE(loyalty_points, 0) + p_points WHERE id = p_customer_id;
  INSERT INTO loyalty_points_history (customer_id, order_id, points_change, reason)
  VALUES (p_customer_id, p_order_id, p_points, p_reason);
END; $$;

CREATE OR REPLACE FUNCTION redeem_loyalty_points(p_customer_id uuid, p_points integer, p_reason text)
RETURNS void LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE caller_company_id uuid; customer_company_id uuid;
BEGIN
  SELECT company_id INTO caller_company_id FROM profiles WHERE id = auth.uid();
  IF caller_company_id IS NULL THEN RAISE EXCEPTION 'Access denied: no company associated with your profile.'; END IF;
  SELECT company_id INTO customer_company_id FROM customers WHERE id = p_customer_id;
  IF customer_company_id IS NULL THEN RAISE EXCEPTION 'Customer not found.'; END IF;
  IF customer_company_id != caller_company_id THEN
    RAISE EXCEPTION 'Access denied: customer belongs to another company.';
  END IF;
  UPDATE customers SET loyalty_points = GREATEST(COALESCE(loyalty_points, 0) - p_points, 0) WHERE id = p_customer_id;
  INSERT INTO loyalty_points_history (customer_id, points_change, reason)
  VALUES (p_customer_id, -p_points, p_reason);
END; $$;

-- =============================================
-- 5. RESTRICCIION DE COMPANIES (solo admin)
-- =============================================
DROP POLICY IF EXISTS "auth_can_insert_companies" ON companies;
DROP POLICY IF EXISTS "auth_can_update_companies" ON companies;
DROP POLICY IF EXISTS "auth_can_delete_companies" ON companies;

CREATE POLICY "admin_can_insert_companies" ON companies
  FOR INSERT WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "admin_can_update_companies" ON companies
  FOR UPDATE USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "admin_can_delete_companies" ON companies
  FOR DELETE USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- =============================================
-- 6. POLICIES DE profiles (rol es enum user_role)
-- =============================================

DROP POLICY IF EXISTS "users_can_update_own_profile" ON profiles;
CREATE POLICY "users_can_update_own_profile" ON profiles
  FOR UPDATE USING (
    id = auth.uid()
    AND (role = (SELECT role FROM profiles WHERE id = auth.uid())
      OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  );

-- =============================================
-- 7. VISTA FINANCIERA FILTRADA POR TENANT
-- =============================================
DROP VIEW IF EXISTS v_treasury_summary;
CREATE VIEW v_treasury_summary AS
SELECT t.company_id,
  COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'INCOME'), 0) AS total_income,
  COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'EXPENSE'), 0) AS total_expense,
  COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'INCOME'), 0)
    - COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'EXPENSE'), 0) AS net_balance
FROM treasury t GROUP BY t.company_id;

DROP VIEW IF EXISTS v_customer_balances;
CREATE VIEW v_customer_balances AS
SELECT c.id AS customer_id, c.name AS customer_name, c.company_id,
  COALESCE(SUM(m.amount) FILTER (WHERE m.movement_type = 'CARGO'), 0) AS total_debt,
  COALESCE(SUM(m.amount) FILTER (WHERE m.movement_type = 'PAGO'), 0) AS total_paid,
  COALESCE(SUM(m.amount) FILTER (WHERE m.movement_type = 'CARGO'), 0)
    - COALESCE(SUM(m.amount) FILTER (WHERE m.movement_type = 'PAGO'), 0) AS current_balance
FROM customers c
LEFT JOIN account_movements m ON m.customer_id = c.id
GROUP BY c.id, c.name, c.company_id;
