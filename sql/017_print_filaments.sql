-- =============================================
-- 017_print_filaments.sql
-- Módulo: Rubro Impresión 3D — Inventario de filamentos
-- Stock de rollos por marca/material/color con costo real por kg
-- Proyecto: EPR Raíces 3.0
-- =============================================

-- =============================================
-- 1. TABLA print_filaments
-- =============================================
CREATE TABLE IF NOT EXISTS public.print_filaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  brand text NOT NULL DEFAULT 'Genérica',
  material text NOT NULL DEFAULT 'PLA'
    CHECK (material IN ('PLA', 'PLA+', 'PETG', 'ABS', 'ASA', 'TPU', 'PA', 'PC', 'Otro')),
  color_name text,
  color_hex text,
  spool_weight_g integer NOT NULL DEFAULT 1000,
  remaining_g numeric(9,1) NOT NULL DEFAULT 1000,
  cost_per_kg numeric(12,2),
  min_stock_g integer NOT NULL DEFAULT 200,
  provider text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.print_filaments IS
  'Inventario de filamentos 3D: rollos con material, color, stock restante y costo por kg para cálculo de costos reales';

-- =============================================
-- 2. ÍNDICES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_print_filaments_company ON public.print_filaments(company_id);
CREATE INDEX IF NOT EXISTS idx_print_filaments_material ON public.print_filaments(material);

-- =============================================
-- 3. TRIGGER updated_at (función ya existe desde 010)
-- =============================================
DROP TRIGGER IF EXISTS trg_print_filaments_updated_at ON public.print_filaments;
CREATE TRIGGER trg_print_filaments_updated_at
  BEFORE UPDATE ON public.print_filaments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================
-- 4. RLS — Aislamiento por tenant
-- =============================================
ALTER TABLE public.print_filaments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON public.print_filaments;
CREATE POLICY "tenant_isolation" ON public.print_filaments
  FOR ALL USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "tenant_insert" ON public.print_filaments;
CREATE POLICY "tenant_insert" ON public.print_filaments
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );
