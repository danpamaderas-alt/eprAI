-- 024_print_model_files_rls_fix.sql
-- Fix 42501 "permission denied for function user_company_id":
-- la función private.user_company_id() no tiene EXECUTE para anon/authenticated.
-- Se reemplaza por la expresión inline (misma que usan print_models/print_jobs_3d).

DROP POLICY IF EXISTS tenant_isolation ON public.print_model_files;

CREATE POLICY tenant_isolation ON public.print_model_files
  FOR ALL
  USING (
    company_id = (
      SELECT p.company_id FROM public.profiles p WHERE p.id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    company_id = (
      SELECT p.company_id FROM public.profiles p WHERE p.id = (SELECT auth.uid())
    )
  );
