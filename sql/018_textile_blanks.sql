-- =============================================
-- 018_textile_blanks.sql
-- Módulo: Rubro Textil/Sublimación — Blanks e insumos vírgenes
-- Tazas, remeras, tumblers, etc. con proveedor, costo y stock mínimo
-- Proyecto: EPR Raíces 3.0
-- =============================================

-- =============================================
-- 1. TABLA textile_blanks
-- =============================================
CREATE TABLE IF NOT EXISTS public.textile_blanks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'Otro'
    CHECK (type IN ('Taza', 'Remera', 'Tumbler', 'Termo', 'Gorra', 'Almohadón', 'Mousepad', 'Llavero', 'Plato', 'Vidrio', 'Tela', 'Otro')),
  size text,
  color text,
  provider text,
  cost_price numeric(12,2) NOT NULL DEFAULT 0,
  stock_qty integer NOT NULL DEFAULT 0,
  min_stock integer NOT NULL DEFAULT 0,
  imagen text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.textile_blanks IS
  'Blanks e insumos textiles/rígidos para sublimación: productos vírgenes con proveedor, costo unitario y control de stock mínimo';

-- =============================================
-- 2. ÍNDICES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_textile_blanks_company ON public.textile_blanks(company_id);
CREATE INDEX IF NOT EXISTS idx_textile_blanks_type ON public.textile_blanks(type);

-- =============================================
-- 3. TRIGGER updated_at (función ya existe desde 010)
-- =============================================
DROP TRIGGER IF EXISTS trg_textile_blanks_updated_at ON public.textile_blanks;
CREATE TRIGGER trg_textile_blanks_updated_at
  BEFORE UPDATE ON public.textile_blanks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================
-- 4. RLS — Aislamiento por tenant
-- =============================================
ALTER TABLE public.textile_blanks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON public.textile_blanks;
CREATE POLICY "tenant_isolation" ON public.textile_blanks
  FOR ALL USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "tenant_insert" ON public.textile_blanks;
CREATE POLICY "tenant_insert" ON public.textile_blanks
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );
