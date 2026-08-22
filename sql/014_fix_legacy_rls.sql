-- ============================================================================
-- 014_fix_legacy_rls.sql
--
-- Endurece las politicas RLS legacy que usaban USING(true)/CHECK(true).
--
-- Contexto (auditoria 2026-08):
--  - 7 tablas pre-multi-tenant sin columna company_id tenian politicas
--    permisivas copiadas de plantilla (incluido un "tenant_isolation" falso).
--    Estan VACIAS y sin referencias en el codigo frontend -> cierre total.
--    Con RLS habilitado y cero politicas, el acceso queda denegado
--    implicitamente para anon/authenticated (service_role no se ve afectado).
--  - Los catalogos globales (sizes, colors, payment_methods, business_units)
--    comparten datos entre empresas por diseno: sus lecturas authenticated
--    se conservan, pero los INSERT se restringen al rol 'admin' usando el
--    mismo patron ya existente en las politicas de companies.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Cierre total de tablas vacias sin uso en el frontend
-- ---------------------------------------------------------------------------

ALTER TABLE "3d_materials_stock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections          ENABLE ROW LEVEL SECURITY;
ALTER TABLE deportiva_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_central   ENABLE ROW LEVEL SECURITY;
ALTER TABLE movement_audit_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos_3d         ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos_textil     ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        '3d_materials_stock',
        'collections',
        'deportiva_inventario',
        'inventario_central',
        'movement_audit_log',
        'productos_3d',
        'productos_textil'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

COMMENT ON TABLE "3d_materials_stock" IS 'LEGACY: sin uso en frontend, acceso denegado por RLS (sin politicas). Ver sql/014.';
COMMENT ON TABLE collections          IS 'LEGACY: sin uso en frontend, acceso denegado por RLS (sin politicas). Ver sql/014.';
COMMENT ON TABLE deportiva_inventario IS 'LEGACY: sin uso en frontend, acceso denegado por RLS (sin politicas). Ver sql/014.';
COMMENT ON TABLE inventario_central   IS 'LEGACY: sin uso en frontend, acceso denegado por RLS (sin politicas). Ver sql/014.';
COMMENT ON TABLE movement_audit_log   IS 'LEGACY: sin uso en frontend, acceso denegado por RLS (sin politicas). Ver sql/014.';
COMMENT ON TABLE productos_3d         IS 'LEGACY: sin uso en frontend, acceso denegado por RLS (sin politicas). Ver sql/014.';
COMMENT ON TABLE productos_textil     IS 'LEGACY: sin uso en frontend, acceso denegado por RLS (sin politicas). Ver sql/014.';

-- ---------------------------------------------------------------------------
-- 2) Escritura de catalogos globales reservada a admins
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS auth_can_insert_sizes ON sizes;
CREATE POLICY admin_can_insert_sizes ON sizes
  FOR INSERT TO public
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS auth_can_insert_colors ON colors;
CREATE POLICY admin_can_insert_colors ON colors
  FOR INSERT TO public
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS auth_can_insert_payment_methods ON payment_methods;
CREATE POLICY admin_can_insert_payment_methods ON payment_methods
  FOR INSERT TO public
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS auth_can_insert_business_units ON business_units;
CREATE POLICY admin_can_insert_business_units ON business_units
  FOR INSERT TO public
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Lecturas de catalogos: se mantienen abiertas a cualquier usuario
-- autenticado a proposito (son datos de referencia compartidos).
-- No requieren cambio.
