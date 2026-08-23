-- 025_rls_function_grants_fix.sql
-- Fix global del error 42501 "permission denied for function user_company_id".
--
-- La migración 008 asumía que una función usada SOLO dentro de expresiones de
-- políticas RLS no necesita EXECUTE para los roles consultantes. Es FALSO:
-- las expresiones de política se evalúan con los privilegios del usuario de la
-- consulta, así que el REVOKE de 008 rompió TODAS las tablas con tenant_isolation
-- basado en private.user_company_id() (37 tablas: orders, products, sales, etc.)
-- con "permission denied for function user_company_id".
--
-- La función es SECURITY DEFINER y devuelve únicamente el company_id del perfil
-- asociado al JWT llamador: grantearle EXECUTE a los roles de API no expone nada.
-- USAGE sobre el schema private NO expone sus tablas (nunca tuvieron grants).

GRANT USAGE ON SCHEMA private TO anon, authenticated;

GRANT EXECUTE ON FUNCTION private.user_company_id() TO anon, authenticated;
