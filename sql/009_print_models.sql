-- =============================================
-- 009_print_models.sql
-- Módulo: Repositorio de Impresión 3D
-- Tabla de modelos 3D con estado de pipeline de fabricación
-- Proyecto: EPR Raíces 3.0
-- =============================================

-- =============================================
-- 1. TABLA print_models
-- =============================================
CREATE TABLE IF NOT EXISTS public.print_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  status text NOT NULL DEFAULT 'Idea'
    CHECK (status IN ('Idea', 'En Cola', 'Imprimiendo', 'Completado', 'Descartado')),
  link_descarga text,
  imagen text,
  material text,
  layer_height numeric(5,2),
  infill numeric(5,2),
  estimated_time_hours numeric(8,2),
  estimated_grams numeric(10,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.print_models IS
  'Catálogo de modelos 3D (descargas MakerWorld/Thingiverse/Cults3D) con estado del pipeline de impresión';

-- =============================================
-- 2. ÍNDICES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_print_models_company ON public.print_models(company_id);
CREATE INDEX IF NOT EXISTS idx_print_models_status ON public.print_models(status);
CREATE INDEX IF NOT EXISTS idx_print_models_category ON public.print_models(category);

-- =============================================
-- 3. TRIGGER updated_at
-- =============================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_print_models_updated_at ON public.print_models;
CREATE TRIGGER trg_print_models_updated_at
  BEFORE UPDATE ON public.print_models
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================
-- 4. RLS — Aislamiento por tenant
-- =============================================
ALTER TABLE public.print_models ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON public.print_models;
CREATE POLICY "tenant_isolation" ON public.print_models
  FOR ALL USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "tenant_insert" ON public.print_models;
CREATE POLICY "tenant_insert" ON public.print_models
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );
