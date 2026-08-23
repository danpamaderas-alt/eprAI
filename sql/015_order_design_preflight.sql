-- 015: Vinculación pedido ↔ diseño + veredicto de preflight + candado POD
-- Pista 1 / Feature 1 (Preflight en Pedidos) y Feature 3 (Candado POD)

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS design_id uuid REFERENCES public.sublimation_designs (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS design_product text,
  ADD COLUMN IF NOT EXISTS design_verdict text CHECK (design_verdict IN ('ok', 'warn', 'bad')),
  ADD COLUMN IF NOT EXISTS design_client_approved boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS design_approved_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_design_id ON public.orders (design_id) WHERE design_id IS NOT NULL;

ALTER TABLE public.sublimation_designs
  ADD COLUMN IF NOT EXISTS pod_permitido boolean NOT NULL DEFAULT false;

