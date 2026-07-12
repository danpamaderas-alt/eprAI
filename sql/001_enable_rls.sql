-- =============================================
-- SPRINT 0: HABILITAR RLS EN TODAS LAS TABLAS
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Primero, asegurar que profiles tenga company_id
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- =============================================
-- HABILITAR ROW LEVEL SECURITY
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE treasury ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE personalization_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_points_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE niches ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLICIES: Perfil propio
-- =============================================
DROP POLICY IF EXISTS "users_can_read_own_profile" ON profiles;
CREATE POLICY "users_can_read_own_profile" ON profiles
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "users_can_update_own_profile" ON profiles;
CREATE POLICY "users_can_update_own_profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- =============================================
-- POLICIES: Company isolation
-- (Solo ven datos de su propia empresa)
-- =============================================

-- Helper: obtener company_id del usuario actual
-- Usamos una subquery inline ya que no podemos crear funciones aquí

-- customers
DROP POLICY IF EXISTS "tenant_isolation" ON customers;
CREATE POLICY "tenant_isolation" ON customers
  FOR ALL USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- orders
DROP POLICY IF EXISTS "tenant_isolation" ON orders;
CREATE POLICY "tenant_isolation" ON orders
  FOR ALL USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- products
DROP POLICY IF EXISTS "tenant_isolation" ON products;
CREATE POLICY "tenant_isolation" ON products
  FOR ALL USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- treasury
DROP POLICY IF EXISTS "tenant_isolation" ON treasury;
CREATE POLICY "tenant_isolation" ON treasury
  FOR ALL USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- account_movements
DROP POLICY IF EXISTS "tenant_isolation" ON account_movements;
CREATE POLICY "tenant_isolation" ON account_movements
  FOR ALL USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- sales
DROP POLICY IF EXISTS "tenant_isolation" ON sales;
CREATE POLICY "tenant_isolation" ON sales
  FOR ALL USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- deliveries
DROP POLICY IF EXISTS "tenant_isolation" ON deliveries;
CREATE POLICY "tenant_isolation" ON deliveries
  FOR ALL USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- resellers
DROP POLICY IF EXISTS "tenant_isolation" ON resellers;
CREATE POLICY "tenant_isolation" ON resellers
  FOR ALL USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- quotes
DROP POLICY IF EXISTS "tenant_isolation" ON quotes;
CREATE POLICY "tenant_isolation" ON quotes
  FOR ALL USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- raw_materials
DROP POLICY IF EXISTS "tenant_isolation" ON raw_materials;
CREATE POLICY "tenant_isolation" ON raw_materials
  FOR ALL USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- services
DROP POLICY IF EXISTS "tenant_isolation" ON services;
CREATE POLICY "tenant_isolation" ON services
  FOR ALL USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- personalization_types
DROP POLICY IF EXISTS "tenant_isolation" ON personalization_types;
CREATE POLICY "tenant_isolation" ON personalization_types
  FOR ALL USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- suppliers
DROP POLICY IF EXISTS "tenant_isolation" ON suppliers;
CREATE POLICY "tenant_isolation" ON suppliers
  FOR ALL USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- clients
DROP POLICY IF EXISTS "tenant_isolation" ON clients;
CREATE POLICY "tenant_isolation" ON clients
  FOR ALL USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- deals
DROP POLICY IF EXISTS "tenant_isolation" ON deals;
CREATE POLICY "tenant_isolation" ON deals
  FOR ALL USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- workers
DROP POLICY IF EXISTS "tenant_isolation" ON workers;
CREATE POLICY "tenant_isolation" ON workers
  FOR ALL USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- worker_tasks
DROP POLICY IF EXISTS "tenant_isolation" ON worker_tasks;
CREATE POLICY "tenant_isolation" ON worker_tasks
  FOR ALL USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- niches
DROP POLICY IF EXISTS "tenant_isolation" ON niches;
CREATE POLICY "tenant_isolation" ON niches
  FOR ALL USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- =============================================
-- POLICIES: Tablas globales (lectura libre, escritura autenticada)
-- =============================================

-- sizes (catálogo global, todos pueden leer)
DROP POLICY IF EXISTS "anyone_can_read_sizes" ON sizes;
CREATE POLICY "anyone_can_read_sizes" ON sizes FOR SELECT USING (true);
DROP POLICY IF EXISTS "auth_can_insert_sizes" ON sizes;
CREATE POLICY "auth_can_insert_sizes" ON sizes FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- colors (catálogo global)
DROP POLICY IF EXISTS "anyone_can_read_colors" ON colors;
CREATE POLICY "anyone_can_read_colors" ON colors FOR SELECT USING (true);
DROP POLICY IF EXISTS "auth_can_insert_colors" ON colors;
CREATE POLICY "auth_can_insert_colors" ON colors FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- payment_methods (catálogo global)
DROP POLICY IF EXISTS "anyone_can_read_payment_methods" ON payment_methods;
CREATE POLICY "anyone_can_read_payment_methods" ON payment_methods FOR SELECT USING (true);
DROP POLICY IF EXISTS "auth_can_insert_payment_methods" ON payment_methods;
CREATE POLICY "auth_can_insert_payment_methods" ON payment_methods FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- business_units (catálogo global)
DROP POLICY IF EXISTS "anyone_can_read_business_units" ON business_units;
CREATE POLICY "anyone_can_read_business_units" ON business_units FOR SELECT USING (true);
DROP POLICY IF EXISTS "auth_can_insert_business_units" ON business_units;
CREATE POLICY "auth_can_insert_business_units" ON business_units FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- companies (usuarios autenticados pueden ver)
DROP POLICY IF EXISTS "auth_can_read_companies" ON companies;
CREATE POLICY "auth_can_read_companies" ON companies FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_can_insert_companies" ON companies;
CREATE POLICY "auth_can_insert_companies" ON companies FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- =============================================
-- POLICIES: quote_items (relacionado con quotes)
-- =============================================
DROP POLICY IF EXISTS "tenant_isolation" ON quote_items;
CREATE POLICY "tenant_isolation" ON quote_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM quotes q
      WHERE q.id = quote_items.quote_id
      AND q.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

-- =============================================
-- POLICIES: reseller_transactions (relacionado con resellers)
-- =============================================
DROP POLICY IF EXISTS "tenant_isolation" ON reseller_transactions;
CREATE POLICY "tenant_isolation" ON reseller_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM resellers r
      WHERE r.id = reseller_transactions."resellerId"
      AND r.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

-- =============================================
-- POLICIES: loyalty_points_history (relacionado con customers)
-- =============================================
DROP POLICY IF EXISTS "tenant_isolation" ON loyalty_points_history;
CREATE POLICY "tenant_isolation" ON loyalty_points_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = loyalty_points_history.customer_id
      AND c.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

-- =============================================
-- POLICIES: product_variants (relacionado con products)
-- =============================================
DROP POLICY IF EXISTS "tenant_isolation" ON product_variants;
CREATE POLICY "tenant_isolation" ON product_variants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_variants.product_id
      AND p.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );
