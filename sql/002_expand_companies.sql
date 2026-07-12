-- 002_expand_companies.sql
-- Expande la tabla companies con campos completos para gestión empresarial

-- 1. Condición fiscal ante IVA (Argentine tax regime)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fiscal_condition text DEFAULT 'RI'
  CHECK (fiscal_condition IN ('RI', 'MONOTRIBUTO', 'EXENTO', 'CF'));

-- 2. Datos de contacto
ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS website text;

-- 3. Domicilio fiscal
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS province text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS postal_code text;

-- 4. Logo / branding
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url text;

-- 5. Configuración por defecto
ALTER TABLE companies ADD COLUMN IF NOT EXISTS default_currency text DEFAULT 'ARS';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS notes text;

-- 6. Completar la política RLS para UPDATE y DELETE
DROP POLICY IF EXISTS "auth_can_update_companies" ON companies;
CREATE POLICY "auth_can_update_companies" ON companies
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_can_delete_companies" ON companies;
CREATE POLICY "auth_can_delete_companies" ON companies
  FOR DELETE USING (auth.role() = 'authenticated');

-- Comentario de la tabla
COMMENT ON TABLE companies IS 'Empresas del sistema ERP — información legal, fiscal y de contacto';
