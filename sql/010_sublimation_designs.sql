-- =============================================
-- 010_sublimation_designs.sql
-- Módulo: Repositorio de Diseños de Sublimación
-- Tabla de diseños con licencia, formato técnico y pipeline de producción
-- Proyecto: EPR Raíces 3.0
-- =============================================

-- =============================================
-- 1. TABLA sublimation_designs
-- =============================================
CREATE TABLE IF NOT EXISTS public.sublimation_designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  status text NOT NULL DEFAULT 'Nuevo'
    CHECK (status IN ('Nuevo', 'Descargado', 'En Preparación', 'Listo para Imprimir', 'Usado', 'Archivado')),
  platform text,
  url_original text,
  link_descarga text,
  imagen text,
  file_format text,
  background text,
  dpi integer,
  dimensions text,
  file_size_mb numeric(8,2),
  bundle_count integer,
  project_dest text,
  license_type text,
  pod_permitido boolean NOT NULL DEFAULT false,
  pod_nivel text,
  ventas_limit integer,
  atribucion_requerida boolean NOT NULL DEFAULT false,
  license_file text,
  license_date timestamptz,
  price numeric(10,2),
  currency text,
  designer text,
  origin text,
  purchase_date timestamptz,
  tags text,
  description text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.sublimation_designs IS
  'Catálogo de diseños de sublimación (Creative Fabrica, Etsy, Design Bundles...) con formato técnico, licencia y pipeline de producción';

-- =============================================
-- 2. ÍNDICES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_sublimation_designs_company ON public.sublimation_designs(company_id);
CREATE INDEX IF NOT EXISTS idx_sublimation_designs_status ON public.sublimation_designs(status);
CREATE INDEX IF NOT EXISTS idx_sublimation_designs_category ON public.sublimation_designs(category);
CREATE INDEX IF NOT EXISTS idx_sublimation_designs_platform ON public.sublimation_designs(platform);

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

DROP TRIGGER IF EXISTS trg_sublimation_designs_updated_at ON public.sublimation_designs;
CREATE TRIGGER trg_sublimation_designs_updated_at
  BEFORE UPDATE ON public.sublimation_designs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================
-- 4. RLS — Aislamiento por tenant
-- =============================================
ALTER TABLE public.sublimation_designs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON public.sublimation_designs;
CREATE POLICY "tenant_isolation" ON public.sublimation_designs
  FOR ALL USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "tenant_insert" ON public.sublimation_designs;
CREATE POLICY "tenant_insert" ON public.sublimation_designs
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );