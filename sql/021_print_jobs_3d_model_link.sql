-- 021_print_jobs_3d_model_link.sql
-- Vincula la cola de produccion 3D con el repositorio de modelos,
-- y registra el resultado comercial: costo real, venta y remito.

ALTER TABLE public.print_jobs_3d
  ADD COLUMN IF NOT EXISTS model_id uuid REFERENCES public.print_models(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS actual_cost_total numeric(12,2),
  ADD COLUMN IF NOT EXISTS sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS remito_id uuid REFERENCES public.remitos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_print_jobs_3d_model ON public.print_jobs_3d(model_id);

COMMENT ON TABLE public.print_jobs_3d IS 'Cola de trabajos de impresion 3D: seguimiento desde presupuestado hasta entregado. Al completar descuenta filamento y registra costo real; al entregar genera venta y remito.';
