-- ============================================================================
-- 033_atomic_stock_ops.sql
-- RPCs atómicas para descontar/sumar stock con lock de fila en SQL.
-- Elimina el TOCTOU del cliente (read-modify-write con estado local):
-- dos completados simultáneos de trabajos 3D podían perder un descuento.
-- PENDIENTE de aplicar (requiere SUPABASE_TOKEN). El store usa estas RPCs
-- con fallback a la lógica client-side si no existen.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.consume_filament_grams(
  p_filament_id uuid,
  p_grams numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  caller_company_id uuid;
  row_company_id uuid;
  new_remaining numeric;
BEGIN
  SELECT company_id INTO caller_company_id FROM profiles WHERE id = auth.uid();
  IF caller_company_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: no company associated with your profile.';
  END IF;

  SELECT company_id INTO row_company_id FROM print_filaments WHERE id = p_filament_id;
  IF row_company_id IS NULL THEN
    RAISE EXCEPTION 'Filament % not found', p_filament_id;
  END IF;
  IF row_company_id != caller_company_id THEN
    RAISE EXCEPTION 'Access denied: filament belongs to another company.';
  END IF;

  UPDATE print_filaments
  SET remaining_g = GREATEST(0, remaining_g - p_grams)
  WHERE id = p_filament_id
  RETURNING remaining_g INTO new_remaining;

  RETURN new_remaining;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.adjust_blank_stock(
  p_blank_id uuid,
  p_delta numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  caller_company_id uuid;
  row_company_id uuid;
  new_stock numeric;
BEGIN
  SELECT company_id INTO caller_company_id FROM profiles WHERE id = auth.uid();
  IF caller_company_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: no company associated with your profile.';
  END IF;

  SELECT company_id INTO row_company_id FROM textile_blanks WHERE id = p_blank_id;
  IF row_company_id IS NULL THEN
    RAISE EXCEPTION 'Blank % not found', p_blank_id;
  END IF;
  IF row_company_id != caller_company_id THEN
    RAISE EXCEPTION 'Access denied: blank belongs to another company.';
  END IF;

  UPDATE textile_blanks
  SET stock_qty = GREATEST(0, stock_qty + p_delta)
  WHERE id = p_blank_id
  RETURNING stock_qty INTO new_stock;

  RETURN new_stock;
END;
$fn$;

-- ============================================================================
-- Grants (mismo patrón de 025_rls_function_grants_fix)
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.consume_filament_grams(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_filament_grams(uuid, numeric) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.adjust_blank_stock(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_blank_stock(uuid, numeric) TO anon, authenticated;