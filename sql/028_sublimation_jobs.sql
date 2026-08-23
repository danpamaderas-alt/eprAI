-- =============================================
-- 028_sublimation_jobs.sql
-- Módulo: Rubro Textil y Sublimación — Cola de producción
-- Espejo de print_jobs_3d: estados, estimaciones de la calculadora
-- de sublimación, costo real y vínculo con el diseño y el blank usado.
-- Proyecto: EPR Raíces 3.0
-- =============================================

CREATE TABLE IF NOT EXISTS public.sublimation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Trabajo sin nombre',
  status text NOT NULL DEFAULT 'presupuestado'
    CHECK (status IN ('presupuestado', 'en_cola', 'imprimiendo', 'completado', 'entregado', 'fallido')),

  -- Snapshot de inputs de la calculadora (costo base, insumos, prensa, etc.)
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,

  design_id uuid REFERENCES public.sublimation_designs(id) ON DELETE SET NULL,
  blank_id uuid REFERENCES public.textile_blanks(id) ON DELETE SET NULL,
  blank_label text,
  size_label text,

  -- Estimaciones (desde la calculadora de sublimación)
  quantity integer NOT NULL DEFAULT 1,
  est_cost_total numeric(12,2),
  est_price_total numeric(12,2),

  -- Reales (al completar)
  actual_cost_total numeric(12,2),
  actual_notes text,

  sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  remito_id uuid REFERENCES public.remitos(id) ON DELETE SET NULL,

  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.sublimation_jobs IS
  'Cola de trabajos de sublimacion: seguimiento desde presupuestado hasta entregado. Al completar registra costo real; al entregar genera venta y remito.';

-- =============================================
-- ÍNDICES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_sublimation_jobs_company ON public.sublimation_jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_sublimation_jobs_status ON public.sublimation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_sublimation_jobs_created ON public.sublimation_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sublimation_jobs_design ON public.sublimation_jobs(design_id);
CREATE INDEX IF NOT EXISTS idx_sublimation_jobs_blank ON public.sublimation_jobs(blank_id);

-- =============================================
-- TRIGGER updated_at (función ya existe desde 010)
-- =============================================
DROP TRIGGER IF EXISTS trg_sublimation_jobs_updated_at ON public.sublimation_jobs;
CREATE TRIGGER trg_sublimation_jobs_updated_at
  BEFORE UPDATE ON public.sublimation_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================
-- RLS — Aislamiento por tenant
-- =============================================
ALTER TABLE public.sublimation_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON public.sublimation_jobs;
CREATE POLICY "tenant_isolation" ON public.sublimation_jobs
  FOR ALL USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "tenant_insert" ON public.sublimation_jobs;
CREATE POLICY "tenant_insert" ON public.sublimation_jobs
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );
