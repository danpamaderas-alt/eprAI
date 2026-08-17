-- Fix UPDATE policies: add WITH CHECK to prevent row reassignment
-- Per supabase-postgres-best-practices: security-rls-basics.md

-- companies: admin can update, but cannot reassign to different company
DROP POLICY IF EXISTS admin_can_update_companies ON companies;
CREATE POLICY admin_can_update_companies ON companies
  FOR UPDATE TO public
  USING (
    (select auth.uid()) IN (
      SELECT id FROM profiles WHERE role = 'admin' AND company_id = companies.id
    )
  )
  WITH CHECK (
    (select auth.uid()) IN (
      SELECT id FROM profiles WHERE role = 'admin' AND company_id = companies.id
    )
  );

-- profiles: users can update own profile, but cannot change company_id
DROP POLICY IF EXISTS users_can_update_own_profile ON profiles;
CREATE POLICY users_can_update_own_profile ON profiles
  FOR UPDATE TO public
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);
