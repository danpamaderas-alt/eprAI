-- ============================================================================
-- 032: HARDENING TENANT ISOLATION
-- ============================================================================
-- Auditoría (agosto 2026) destapó 3 huecos de aislamiento multi-tenant:
--
-- 1) C2 · Storage: los buckets design-images (016) y print-files (022) tienen
--    políticas por bucket_id SIN filtro de tenant. Cualquier authenticated puede
--    leer/escribir archivos de OTRA empresa (los paths llevan el companyId, pero
--    la política no lo valida). Fix: exigir que el 1er segmento del path
--    (`{companyId}/...`) sea el company_id del propio JWT.
--
-- 2) C4 · companies: la policy auth_can_read_companies (001) permite leer TODAS
--    las empresas a cualquier authenticated -> filtración de razón social, CUIT,
--    dirección, etc. Fix: solo la propia company_id + rol admin.
--
-- 3) C3 · remitos.status: el CHECK actual (013) no incluye PARTIAL/PENDING.
--    La nueva RPC register_delivery_v2 (sql/031, sin aplicar aún) puede escribir
--    esos estados. Fix DEFENSIVO: ampliar el CHECK ANTES de aplicar 031.
-- ============================================================================

-- ============================================================================
-- 1. STORAGE: TENANT ISOLATION POR PRIMER SEGMENTO DEL PATH
-- ============================================================================
-- Los objetos se suben como `{company_id}/{uuid}.{ext}` (design-images) y
-- `{company_id}/{model_id}/{uuid}.{ext}` (print-files). storage.foldername(name)[1]
-- es el company_id. El cast a text evita un 42501 si la función no tuviera EXECUTE
-- (ya restaurado en 025 para anon/authenticated).

DROP POLICY IF EXISTS "design_images_select" ON storage.objects;
DROP POLICY IF EXISTS "design_images_insert" ON storage.objects;
DROP POLICY IF EXISTS "design_images_update" ON storage.objects;
DROP POLICY IF EXISTS "design_images_delete" ON storage.objects;

CREATE POLICY "design_images_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'design-images'
  AND (storage.foldername(name))[1] = (SELECT private.user_company_id())::text
);

CREATE POLICY "design_images_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'design-images'
  AND (storage.foldername(name))[1] = (SELECT private.user_company_id())::text
);

CREATE POLICY "design_images_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'design-images'
  AND (storage.foldername(name))[1] = (SELECT private.user_company_id())::text
);

CREATE POLICY "design_images_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'design-images'
  AND (storage.foldername(name))[1] = (SELECT private.user_company_id())::text
);

DROP POLICY IF EXISTS "print_files_select" ON storage.objects;
DROP POLICY IF EXISTS "print_files_insert" ON storage.objects;
DROP POLICY IF EXISTS "print_files_update" ON storage.objects;
DROP POLICY IF EXISTS "print_files_delete" ON storage.objects;

CREATE POLICY "print_files_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'print-files'
  AND (storage.foldername(name))[1] = (SELECT private.user_company_id())::text
);

CREATE POLICY "print_files_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'print-files'
  AND (storage.foldername(name))[1] = (SELECT private.user_company_id())::text
);

CREATE POLICY "print_files_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'print-files'
  AND (storage.foldername(name))[1] = (SELECT private.user_company_id())::text
);

CREATE POLICY "print_files_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'print-files'
  AND (storage.foldername(name))[1] = (SELECT private.user_company_id())::text
);

-- ============================================================================
-- 2. COMPANIES: SOLO PROPIA + ADMIN
-- ============================================================================
-- Se reemplaza la policy abierta de 001. Queda el switcher del Sidebar
-- mostrando únicamente la empresa del usuario (admin puede ver todas).

DROP POLICY IF EXISTS "auth_can_read_companies" ON companies;

CREATE POLICY "auth_can_read_own_company" ON companies
FOR SELECT
USING (
  id = (SELECT private.user_company_id())
  OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- ============================================================================
-- 3. REMITOS: AMPLIAR CHECK DE STATUS (DEFENSIVO PARA register_delivery_v2)
-- ============================================================================
-- create_order_atomic / register_delivery_v2 podrían materializar entregas
-- parciales como remito con status PARTIAL/PENDING. Se amplía el dominio ANTES
-- de aplicar 031 para que la RPC no explote con violación de constraint.

ALTER TABLE public.remitos DROP CONSTRAINT IF EXISTS remitos_status_check;
ALTER TABLE public.remitos
  ADD CONSTRAINT remitos_status_check
  CHECK (status IN ('DRAFT', 'SENT', 'PARTIAL', 'PENDING', 'DELIVERED', 'CANCELLED'));