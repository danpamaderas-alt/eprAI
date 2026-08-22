-- ============================================================================
-- PHASE 5: RLS Performance Optimization + Composite Indexes + App Query Fixes
-- ============================================================================

-- ============================================================================
-- 1. CREATE PRIVATE HELPER FUNCTION (SECURITY DEFINER)
-- ============================================================================

-- This function caches the user's company_id for the duration of a query,
-- avoiding N repeated subqueries to profiles in RLS policies.
CREATE OR REPLACE FUNCTION private.user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT company_id FROM public.profiles WHERE id = (SELECT auth.uid()) LIMIT 1;
$$;

-- Revoke direct execution from public roles (only usable inside policies)
REVOKE EXECUTE ON FUNCTION private.user_company_id() FROM PUBLIC, anon, authenticated, service_role;

-- ============================================================================
-- 2. REFACTOR RLS POLICIES - Tables with direct company_id column
-- ============================================================================

-- These policies switch from inline subquery to cached function call.
-- Pattern: company_id = (SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid())
-- Becomes:  company_id = (SELECT private.user_company_id())

-- account_movements
DROP POLICY IF EXISTS tenant_isolation ON account_movements;
CREATE POLICY tenant_isolation ON account_movements
  FOR ALL USING (company_id = (SELECT private.user_company_id()));

-- clients
DROP POLICY IF EXISTS tenant_isolation ON clients;
CREATE POLICY tenant_isolation ON clients
  FOR ALL USING (company_id = (SELECT private.user_company_id()));

-- companies (keep admin check as-is, it's different)
-- deals
DROP POLICY IF EXISTS tenant_isolation ON deals;
CREATE POLICY tenant_isolation ON deals
  FOR ALL USING (company_id = (SELECT private.user_company_id()));

-- deliveries
DROP POLICY IF EXISTS tenant_isolation ON deliveries;
CREATE POLICY tenant_isolation ON deliveries
  FOR ALL USING (company_id = (SELECT private.user_company_id()));

-- expenses
DROP POLICY IF EXISTS tenant_isolation ON expenses;
CREATE POLICY tenant_isolation ON expenses
  FOR ALL USING (company_id = (SELECT private.user_company_id()));

-- niches
DROP POLICY IF EXISTS tenant_isolation ON niches;
CREATE POLICY tenant_isolation ON niches
  FOR ALL USING (company_id = (SELECT private.user_company_id()));

-- orders
DROP POLICY IF EXISTS tenant_isolation ON orders;
CREATE POLICY tenant_isolation ON orders
  FOR ALL USING (company_id = (SELECT private.user_company_id()));

-- packaging_supplies
DROP POLICY IF EXISTS tenant_isolation ON packaging_supplies;
CREATE POLICY tenant_isolation ON packaging_supplies
  FOR ALL USING (company_id = (SELECT private.user_company_id()));

-- personalization_types
DROP POLICY IF EXISTS tenant_isolation ON personalization_types;
CREATE POLICY tenant_isolation ON personalization_types
  FOR ALL USING (company_id = (SELECT private.user_company_id()));

-- products
DROP POLICY IF EXISTS tenant_isolation ON products;
CREATE POLICY tenant_isolation ON products
  FOR ALL USING (company_id = (SELECT private.user_company_id()));

-- quotes
DROP POLICY IF EXISTS tenant_isolation ON quotes;
CREATE POLICY tenant_isolation ON quotes
  FOR ALL USING (company_id = (SELECT private.user_company_id()));

-- raw_materials
DROP POLICY IF EXISTS tenant_isolation ON raw_materials;
CREATE POLICY tenant_isolation ON raw_materials
  FOR ALL USING (company_id = (SELECT private.user_company_id()));

-- resellers
DROP POLICY IF EXISTS tenant_isolation ON resellers;
CREATE POLICY tenant_isolation ON resellers
  FOR ALL USING (company_id = (SELECT private.user_company_id()));

-- sales
DROP POLICY IF EXISTS tenant_isolation ON sales;
CREATE POLICY tenant_isolation ON sales
  FOR ALL USING (company_id = (SELECT private.user_company_id()));

-- services
DROP POLICY IF EXISTS tenant_isolation ON services;
CREATE POLICY tenant_isolation ON services
  FOR ALL USING (company_id = (SELECT private.user_company_id()));

-- supplier_debts
DROP POLICY IF EXISTS tenant_isolation ON supplier_debts;
CREATE POLICY tenant_isolation ON supplier_debts
  FOR ALL USING (company_id = (SELECT private.user_company_id()));

-- suppliers
DROP POLICY IF EXISTS tenant_isolation ON suppliers;
CREATE POLICY tenant_isolation ON suppliers
  FOR ALL USING (company_id = (SELECT private.user_company_id()));

-- treasury
DROP POLICY IF EXISTS tenant_isolation ON treasury;
CREATE POLICY tenant_isolation ON treasury
  FOR ALL USING (company_id = (SELECT private.user_company_id()));

-- worker_tasks
DROP POLICY IF EXISTS tenant_isolation ON worker_tasks;
CREATE POLICY tenant_isolation ON worker_tasks
  FOR ALL USING (company_id = (SELECT private.user_company_id()));

-- workers
DROP POLICY IF EXISTS tenant_isolation ON workers;
CREATE POLICY tenant_isolation ON workers
  FOR ALL USING (company_id = (SELECT private.user_company_id()));

-- ============================================================================
-- 3. REFACTOR RLS POLICIES - Tables with EXISTS (FK join through another table)
-- ============================================================================

-- These are the expensive policies that join through other tables.
-- We optimize by using the cached company_id function.

-- client_gifts (joins through customers)
DROP POLICY IF EXISTS tenant_isolation ON client_gifts;
CREATE POLICY tenant_isolation ON client_gifts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = client_gifts.customer_id
        AND c.company_id = (SELECT private.user_company_id())
    )
  );

-- client_movements (joins through customers)
DROP POLICY IF EXISTS tenant_isolation ON client_movements;
CREATE POLICY tenant_isolation ON client_movements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = client_movements.customer_id
        AND c.company_id = (SELECT private.user_company_id())
    )
  );

-- customers
DROP POLICY IF EXISTS tenant_isolation ON customers;
CREATE POLICY tenant_isolation ON customers
  FOR ALL USING (company_id = (SELECT private.user_company_id()));

-- custom_orders (joins through customers)
DROP POLICY IF EXISTS tenant_isolation ON custom_orders;
CREATE POLICY tenant_isolation ON custom_orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = custom_orders.customer_id
        AND c.company_id = (SELECT private.user_company_id())
    )
  );

-- customer_debts (joins through customers)
DROP POLICY IF EXISTS tenant_isolation ON customer_debts;
CREATE POLICY tenant_isolation ON customer_debts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_debts.customer_id
        AND c.company_id = (SELECT private.user_company_id())
    )
  );

-- debt_payments (joins through customer_debts -> customers)
DROP POLICY IF EXISTS tenant_isolation ON debt_payments;
CREATE POLICY tenant_isolation ON debt_payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customer_debts cd
      JOIN customers c ON c.id = cd.customer_id
      WHERE cd.id = debt_payments.debt_id
        AND c.company_id = (SELECT private.user_company_id())
    )
  );

-- inventory (joins through products)
DROP POLICY IF EXISTS tenant_isolation ON inventory;
CREATE POLICY tenant_isolation ON inventory
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = inventory.product_id
        AND p.company_id = (SELECT private.user_company_id())
    )
  );

-- loyalty_points_history (joins through customers)
DROP POLICY IF EXISTS tenant_isolation ON loyalty_points_history;
CREATE POLICY tenant_isolation ON loyalty_points_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = loyalty_points_history.customer_id
        AND c.company_id = (SELECT private.user_company_id())
    )
  );

-- order_items (joins through orders)
DROP POLICY IF EXISTS tenant_isolation ON order_items;
CREATE POLICY tenant_isolation ON order_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND o.company_id = (SELECT private.user_company_id())
    )
  );

-- portal_users (joins through customers)
DROP POLICY IF EXISTS tenant_isolation ON portal_users;
CREATE POLICY tenant_isolation ON portal_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = portal_users.customer_id
        AND c.company_id = (SELECT private.user_company_id())
    )
  );

-- product_recipes (joins through products)
DROP POLICY IF EXISTS tenant_isolation ON product_recipes;
CREATE POLICY tenant_isolation ON product_recipes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_recipes.product_id
        AND p.company_id = (SELECT private.user_company_id())
    )
  );

-- product_variants (joins through products)
DROP POLICY IF EXISTS tenant_isolation ON product_variants;
CREATE POLICY tenant_isolation ON product_variants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_variants.product_id
        AND p.company_id = (SELECT private.user_company_id())
    )
  );

-- quote_items (joins through quotes)
DROP POLICY IF EXISTS tenant_isolation ON quote_items;
CREATE POLICY tenant_isolation ON quote_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM quotes q
      WHERE q.id = quote_items.quote_id
        AND q.company_id = (SELECT private.user_company_id())
    )
  );

-- reseller_transactions (company_id directo en la tabla viva; join como fallback)
DROP POLICY IF EXISTS tenant_isolation ON reseller_transactions;
CREATE POLICY tenant_isolation ON reseller_transactions
  FOR ALL USING (
    company_id = (SELECT private.user_company_id())
    OR EXISTS (
      SELECT 1 FROM resellers r
      WHERE r.id = reseller_transactions.reseller_id
        AND r.company_id = (SELECT private.user_company_id())
    )
  );

-- stock_movements (joins through products)
DROP POLICY IF EXISTS tenant_isolation ON stock_movements;
CREATE POLICY tenant_isolation ON stock_movements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = stock_movements.product_id
        AND p.company_id = (SELECT private.user_company_id())
    )
  );

-- transactions (joins through customers)
DROP POLICY IF EXISTS tenant_isolation ON transactions;
CREATE POLICY tenant_isolation ON transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = transactions.customer_id
        AND c.company_id = (SELECT private.user_company_id())
    )
  );

-- ============================================================================
-- 4. FIX profiles.policy: auth.uid() without SELECT wrapper
-- ============================================================================

DROP POLICY IF EXISTS users_can_read_own_profile ON profiles;
CREATE POLICY users_can_read_own_profile ON profiles
  FOR SELECT USING (id = (SELECT auth.uid()));

-- users_can_update_own_profile already uses (SELECT auth.uid()) - no change needed

-- ============================================================================
-- 5. COMPOSITE INDEXES - Most queried tables
-- ============================================================================

-- orders: company_id + created_at (6 queries use this pattern)
CREATE INDEX IF NOT EXISTS idx_orders_company_created
  ON orders (company_id, created_at DESC);

-- orders: company_id + status (count/filter queries)
CREATE INDEX IF NOT EXISTS idx_orders_company_status
  ON orders (company_id, status);

-- sales: company_id + created_at (3 queries use this pattern)
CREATE INDEX IF NOT EXISTS idx_sales_company_created
  ON sales (company_id, created_at DESC);

-- customers: company_id + name (4 queries order by name)
CREATE INDEX IF NOT EXISTS idx_customers_company_name
  ON customers (company_id, name);

-- treasury: company_id + date (3 queries order by date)
CREATE INDEX IF NOT EXISTS idx_treasury_company_date
  ON treasury (company_id, date DESC);

-- quotes: company_id + created_at (2 queries order by created_at)
CREATE INDEX IF NOT EXISTS idx_quotes_company_created
  ON quotes (company_id, created_at DESC);

-- stock_movements: created_at (StockHistory orders by created_at)
CREATE INDEX IF NOT EXISTS idx_stock_movements_created
  ON stock_movements (created_at DESC);

-- order_items: order_id (delete cascade, FK lookup)
CREATE INDEX IF NOT EXISTS idx_order_items_order_id
  ON order_items (order_id);

-- quote_items: quote_id (FK lookup)
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id
  ON quote_items (quote_id);

-- loyalty_points_history: customer_id + created_at (3 queries)
CREATE INDEX IF NOT EXISTS idx_loyalty_points_customer_created
  ON loyalty_points_history (customer_id, created_at DESC);

-- account_movements: customer_id + company_id + date (composite filter)
CREATE INDEX IF NOT EXISTS idx_account_movements_customer_company_date
  ON account_movements (customer_id, company_id, date DESC);
