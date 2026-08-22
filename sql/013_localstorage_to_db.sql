-- ============================================================================
-- 013: LOCALSTORAGE -> DB - Meta de pedidos y Remitos
-- ============================================================================
-- Los pagos, notas, fotos, etapa de produccion y prioridad de los pedidos
-- viven SOLO en localStorage del navegador (epr_orders_meta): se pierden al
-- cambiar de dispositivo y nunca llegaron a la DB. Idem los remitos
-- completos (epr_remitos).
--
-- REQUISITO: orders ya tiene RLS con tenant_isolation (001/008), las nuevas
-- columnas quedan cubiertas automaticamente.
-- ============================================================================

-- ============================================================================
-- 1. COLUMNAS DE META EN ORDERS (antes en localStorage)
-- ============================================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS priority text,
  ADD COLUMN IF NOT EXISTS production_stage text,
  ADD COLUMN IF NOT EXISTS activity_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS payments jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS internal_notes text;

-- ============================================================================
-- 2. TABLA REMITOS (antes 100% localStorage en epr_remitos)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.remitos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  number text NOT NULL,
  date timestamptz NOT NULL DEFAULT now(),
  customer text,
  address text,
  status text NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'SENT', 'DELIVERED', 'CANCELLED')),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  view_type text NOT NULL DEFAULT 'STANDARD'
    CHECK (view_type IN ('STANDARD', 'PENDING', 'VALUED')),
  total numeric(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. INDEXES (patron 006)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_remitos_company_id ON public.remitos (company_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_remitos_order_id ON public.remitos (order_id);

-- ============================================================================
-- 4. RLS + TENANT ISOLATION (patron 005/008)
-- ============================================================================

ALTER TABLE public.remitos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON public.remitos;
CREATE POLICY tenant_isolation ON public.remitos
  FOR ALL USING (company_id = (SELECT private.user_company_id()));
