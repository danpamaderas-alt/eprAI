-- =============================================
-- 019_mockup_templates.sql
-- Módulo: Rubro Textil/Sublimación — Plantillas de mockup
-- Base de productos con área de impresión exacta para mockups canvas
-- Proyecto: EPR Raíces 3.0
-- =============================================

-- =============================================
-- 1. TABLA mockup_templates
-- =============================================
CREATE TABLE IF NOT EXISTS public.mockup_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  product_type text NOT NULL DEFAULT 'Otro'
    CHECK (product_type IN ('Taza', 'Remera', 'Tumbler', 'Termo', 'Gorra', 'Almohadón', 'Mousepad', 'Llavero', 'Plato', 'Vidrio', 'Otro')),
  print_area_width_mm numeric(8,2),
  print_area_height_mm numeric(8,2),
  template_image text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.mockup_templates IS
  'Plantillas base de mockups por producto con área de impresión en mm para composición canvas precisa';

-- =============================================
-- 2. ÍNDICES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_mockup_templates_company ON public.mockup_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_mockup_templates_product ON public.mockup_templates(product_type);

-- =============================================
-- 3. TRIGGER updated_at (función ya existe desde 010)
-- =============================================
DROP TRIGGER IF EXISTS trg_mockup_templates_updated_at ON public.mockup_templates;
CREATE TRIGGER trg_mockup_templates_updated_at
  BEFORE UPDATE ON public.mockup_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================
-- 4. RLS — Aislamiento por tenant
-- =============================================
ALTER TABLE public.mockup_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON public.mockup_templates;
CREATE POLICY "tenant_isolation" ON public.mockup_templates
  FOR ALL USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "tenant_insert" ON public.mockup_templates;
CREATE POLICY "tenant_insert" ON public.mockup_templates
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );
