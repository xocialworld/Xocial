-- Fix RLS policies for profiles table so that:
-- 1. A newly signed-up authenticated user can insert their own row
-- 2. Users can read and update their own profile
-- 3. Service role retains full access (already set in 20251128000000)

-- Ensure RLS is enabled on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow an authenticated user to insert ONLY their own profile row
-- (id must equal auth.uid() to prevent spoofing)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Allow an authenticated user to read their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Allow an authenticated user to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Allow workspace members to view profiles of other members in shared workspaces
-- (needed for showing team member names/avatars in comments, approvals, etc.)
DROP POLICY IF EXISTS "Members can view profiles in shared workspaces" ON public.profiles;
CREATE POLICY "Members can view profiles in shared workspaces"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT user_id
      FROM public.workspace_members
      WHERE workspace_id IN (
        SELECT workspace_id
        FROM public.workspace_members
        WHERE user_id = auth.uid()
      )
    )
  );
