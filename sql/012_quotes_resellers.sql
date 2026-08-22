-- ============================================================================
-- 012: QUOTES + RESELLERS - Alineacion de seguridad e indices
-- ============================================================================
-- NOTA DE CONCILIACION: las 4 tablas ya existen en la DB de produccion
-- (nunca estuvieron versionadas en este repo). Esta migracion NO las crea:
-- aplica RLS tenant-isolation y los indices faltantes sobre el esquema REAL:
--
--   quotes(id, company_id, customer_id, quote_number, total, notes,
--          status, items jsonb, created_at)
--   quote_items(id, quote_id, product_id, description, quantity,
--               unit_price, subtotal)
--   resellers(id, company_id, name, phone, balance, created_at)
--   reseller_transactions(id, company_id, reseller_id, type, description,
--                         amount, created_at)
--
-- El codigo (QuoteDashboard / useResellerStore) fue alineado a estas columnas.
-- REQUISITO: haber ejecutado 008 (crea private.user_company_id()).
-- ============================================================================

-- ============================================================================
-- 1. INDEXES (patron 006)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_quotes_company_id ON public.quotes (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON public.quotes (customer_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON public.quote_items (quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_product_id ON public.quote_items (product_id);
CREATE INDEX IF NOT EXISTS idx_resellers_company_id ON public.resellers (company_id);
CREATE INDEX IF NOT EXISTS idx_reseller_tx_reseller_id ON public.reseller_transactions (reseller_id, created_at DESC);

-- ============================================================================
-- 2. RLS + TENANT ISOLATION (patron 005/008)
-- ============================================================================

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reseller_transactions ENABLE ROW LEVEL SECURITY;

-- quotes (company_id directo)
DROP POLICY IF EXISTS tenant_isolation ON public.quotes;
CREATE POLICY tenant_isolation ON public.quotes
  FOR ALL USING (company_id = (SELECT private.user_company_id()));

-- quote_items (join a traves de quotes)
DROP POLICY IF EXISTS tenant_isolation ON public.quote_items;
CREATE POLICY tenant_isolation ON public.quote_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_items.quote_id
        AND q.company_id = (SELECT private.user_company_id())
    )
  );

-- resellers (company_id directo)
DROP POLICY IF EXISTS tenant_isolation ON public.resellers;
CREATE POLICY tenant_isolation ON public.resellers
  FOR ALL USING (company_id = (SELECT private.user_company_id()));

-- reseller_transactions (company_id directo; join como fallback SOLO para lectura.
-- WITH CHECK estricto: todo INSERT/UPDATE debe traer company_id propio Y un
-- reseller de la misma empresa, evita filas con company_id ajeno o NULL.)
DROP POLICY IF EXISTS tenant_isolation ON public.reseller_transactions;
CREATE POLICY tenant_isolation ON public.reseller_transactions
  FOR ALL
  USING (
    company_id = (SELECT private.user_company_id())
    OR EXISTS (
      SELECT 1 FROM public.resellers r
      WHERE r.id = reseller_transactions.reseller_id
        AND r.company_id = (SELECT private.user_company_id())
    )
  )
  WITH CHECK (
    company_id = (SELECT private.user_company_id())
    AND EXISTS (
      SELECT 1 FROM public.resellers r
      WHERE r.id = reseller_transactions.reseller_id
        AND r.company_id = (SELECT private.user_company_id())
    )
  );
