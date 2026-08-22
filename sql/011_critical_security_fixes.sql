-- =============================================
-- 011_critical_security_fixes.sql
-- Corrige hallazgos criticos de la auditoria de seguridad
-- Ejecutar en Supabase SQL Editor (proyecto gjzvdepevoviygrcdwqj)
--
-- Fix 1: Auto-elevacion de rol / salto de tenant en profiles
-- Fix 2: ENABLE ROW LEVEL SECURITY en tablas que solo tenian policies
-- Fix 3: Vistas financieras con security_invoker (bypass de RLS)
-- Fix 4: Policies USING(true) abiertas a anon -> solo authenticated
-- =============================================

-- =============================================
-- FIX 1: profiles UPDATE no puede cambiar role ni company_id
-- (antes: WITH CHECK solo validaba id => cualquiera se hacia admin)
-- =============================================
DROP POLICY IF EXISTS users_can_update_own_profile ON profiles;
CREATE POLICY users_can_update_own_profile ON profiles
  FOR UPDATE TO public
  USING ((select auth.uid()) = id)
  WITH CHECK (
    (select auth.uid()) = id
    AND role = (SELECT p.role FROM profiles p WHERE p.id = (select auth.uid()))
    AND company_id IS NOT DISTINCT FROM (SELECT p.company_id FROM profiles p WHERE p.id = (select auth.uid()))
  );

-- =============================================
-- FIX 2: Habilitar RLS en tablas con policies pero sin RLS activo
-- (policy sin RLS habilitado = tabla abierta via PostgREST con anon key)
-- =============================================
ALTER TABLE expenses            ENABLE ROW LEVEL SECURITY;
ALTER TABLE packaging_supplies  ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_debts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_movements    ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_gifts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_debts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE movement_audit_log  ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_recipes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory           ENABLE ROW LEVEL SECURITY;

-- Tablas legacy sin company_id: tambien quedaban sin RLS activo
ALTER TABLE deportiva_inventario   ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_central     ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos_3d           ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos_textil       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "3d_materials_stock"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections            ENABLE ROW LEVEL SECURITY;

-- =============================================
-- FIX 3: Vistas financieras con security_invoker
-- (sin esto, la vista ejecuta con privilegios del owner y
--  devuelve datos de TODAS las empresas a cualquier rol)
-- =============================================
DROP VIEW IF EXISTS v_treasury_summary;
CREATE VIEW v_treasury_summary WITH (security_invoker = true) AS
SELECT t.company_id,
  COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'INCOME'), 0) AS total_income,
  COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'EXPENSE'), 0) AS total_expense,
  COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'INCOME'), 0)
    - COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'EXPENSE'), 0) AS net_balance
FROM treasury t GROUP BY t.company_id;

DROP VIEW IF EXISTS v_customer_balances;
CREATE VIEW v_customer_balances WITH (security_invoker = true) AS
SELECT c.id AS customer_id, c.name AS customer_name, c.company_id,
  COALESCE(SUM(m.amount) FILTER (WHERE m.movement_type = 'CARGO'), 0) AS total_debt,
  COALESCE(SUM(m.amount) FILTER (WHERE m.movement_type = 'PAGO'), 0) AS total_paid,
  COALESCE(SUM(m.amount) FILTER (WHERE m.movement_type = 'CARGO'), 0)
    - COALESCE(SUM(m.amount) FILTER (WHERE m.movement_type = 'PAGO'), 0) AS current_balance
FROM customers c
LEFT JOIN account_movements m ON m.customer_id = c.id
GROUP BY c.id, c.name, c.company_id;

-- =============================================
-- FIX 4: Policies USING(true) sin clausula TO => aplicaban a anon.
-- Se recrean limitadas a authenticated (anon queda sin acceso).
-- =============================================
DROP POLICY IF EXISTS tenant_isolation ON movement_audit_log;
CREATE POLICY tenant_isolation ON movement_audit_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS tenant_isolation ON deportiva_inventario;
CREATE POLICY tenant_isolation ON deportiva_inventario
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS tenant_isolation ON inventario_central;
CREATE POLICY tenant_isolation ON inventario_central
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS tenant_isolation ON productos_3d;
CREATE POLICY tenant_isolation ON productos_3d
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS tenant_isolation ON productos_textil;
CREATE POLICY tenant_isolation ON productos_textil
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS tenant_isolation ON "3d_materials_stock";
CREATE POLICY tenant_isolation ON "3d_materials_stock"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS tenant_isolation ON collections;
CREATE POLICY tenant_isolation ON collections
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- VERIFICACION (ejecutar por separado despues de aplicar):
--
-- Tablas publicas sin RLS (debe devolver 0 filas):
-- SELECT c.relname
-- FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'public' AND c.relkind = 'r'
--   AND c.relrowsecurity = false;
--
-- Perfiles con rol admin (verificar que sean legitimos):
-- SELECT id, role, company_id FROM profiles WHERE role = 'admin';
--
-- Vistas con security_invoker (debe devolver las 2 con true):
-- SELECT viewname, options FROM pg_views
-- WHERE schemaname = 'public' AND viewname LIKE 'v_%';
-- =============================================
