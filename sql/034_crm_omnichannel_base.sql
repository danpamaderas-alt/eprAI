-- =============================================
-- 034_crm_omnichannel_base.sql
-- Base para CRM Omnicanal: Identificadores de contacto y bitácora de interacciones.
-- =============================================

-- 1. Agregar identificadores de redes sociales y mensajería a customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS whatsapp_id text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email_primary text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS instagram_handle text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS facebook_id text;

-- 2. Tabla de interacciones unificadas
CREATE TABLE IF NOT EXISTS customer_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('whatsapp', 'email', 'instagram', 'facebook', 'manual')),
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  content text NOT NULL,
  metadata jsonb, -- Para guardar IDs de mensaje, adjuntos, etc.
  created_at timestamptz DEFAULT now()
);

-- 3. Aislamiento Multi-tenant (RLS)
ALTER TABLE customer_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Interacciones accesibles solo por la propia empresa"
  ON customer_interactions
  FOR ALL
  TO authenticated
  USING (company_id = private.user_company_id());

-- 4. Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_interactions_customer ON customer_interactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_interactions_company ON customer_interactions(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_whatsapp ON customers(whatsapp_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email_primary);
