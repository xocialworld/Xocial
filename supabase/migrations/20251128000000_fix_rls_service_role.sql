-- Fix RLS policies to allow service role full access
-- This ensures API middleware can perform admin operations without RLS recursion

-- PROFILES
DROP POLICY IF EXISTS "Service role can manage profiles" ON public.profiles;
CREATE POLICY "Service role can manage profiles"
  ON public.profiles FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- WORKSPACES
DROP POLICY IF EXISTS "Service role can manage workspaces" ON public.workspaces;
CREATE POLICY "Service role can manage workspaces"
  ON public.workspaces FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- WORKSPACE_MEMBERS
DROP POLICY IF EXISTS "Service role can manage members" ON public.workspace_members;
CREATE POLICY "Service role can manage members"
  ON public.workspace_members FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- SOCIAL_ACCOUNTS
DROP POLICY IF EXISTS "Service role can manage accounts" ON public.social_accounts;
CREATE POLICY "Service role can manage accounts"
  ON public.social_accounts FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
