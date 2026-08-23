-- =============================================
-- 020_print_jobs_3d.sql
-- Módulo: Rubro Impresión 3D — Registro de trabajos de impresión
-- Cola de producción con estados, estimaciones de la calculadora,
-- datos reales al finalizar y vínculo con el rollo de filamento usado.
-- Proyecto: EPR Raíces 3.0
-- =============================================

-- =============================================
-- 1. TABLA print_jobs_3d
-- =============================================
CREATE TABLE IF NOT EXISTS public.print_jobs_3d (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Trabajo sin nombre',
  status text NOT NULL DEFAULT 'presupuestado'
    CHECK (status IN ('presupuestado', 'en_cola', 'imprimiendo', 'completado', 'entregado', 'fallido')),

  -- Snapshot de inputs de la calculadora (peso, tiempos, costos unitarios, etc.)
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,

  printer_name text,
  filament_id uuid REFERENCES public.print_filaments(id) ON DELETE SET NULL,
  filament_label text,

  -- Estimaciones (desde la calculadora)
  quantity integer NOT NULL DEFAULT 1,
  est_weight_g numeric(9,1),
  est_time_h numeric(6,2),
  est_cost_total numeric(12,2),
  est_price_total numeric(12,2),

  -- Reales (al completar)
  actual_weight_g numeric(9,1),
  actual_time_h numeric(6,2),
  actual_notes text,

  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.print_jobs_3d IS
  'Trabajos de impresión 3D: cola de producción con estimaciones de la calculadora, consumo real de filamento y comparativa estimado vs real';

-- =============================================
-- 2. ÍNDICES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_print_jobs_3d_company ON public.print_jobs_3d(company_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_3d_status ON public.print_jobs_3d(status);
CREATE INDEX IF NOT EXISTS idx_print_jobs_3d_created ON public.print_jobs_3d(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_print_jobs_3d_filament ON public.print_jobs_3d(filament_id);

-- =============================================
-- 3. TRIGGER updated_at (función ya existe desde 010)
-- =============================================
DROP TRIGGER IF EXISTS trg_print_jobs_3d_updated_at ON public.print_jobs_3d;
CREATE TRIGGER trg_print_jobs_3d_updated_at
  BEFORE UPDATE ON public.print_jobs_3d
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================
-- 4. RLS — Aislamiento por tenant
-- =============================================
ALTER TABLE public.print_jobs_3d ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON public.print_jobs_3d;
CREATE POLICY "tenant_isolation" ON public.print_jobs_3d
  FOR ALL USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "tenant_insert" ON public.print_jobs_3d;
CREATE POLICY "tenant_insert" ON public.print_jobs_3d
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );
