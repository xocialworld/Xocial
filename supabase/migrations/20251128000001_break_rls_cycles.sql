-- Break RLS policy cycles between workspaces and workspace_members
-- Ensure service_role can manage membership; users can view only their own membership

-- Drop existing policies that cause cycles
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workspace_members' AND policyname = 'Users can view workspace members'
  ) THEN
    DROP POLICY "Users can view workspace members" ON public.workspace_members;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workspace_members' AND policyname = 'Workspace owners can manage members'
  ) THEN
    DROP POLICY "Workspace owners can manage members" ON public.workspace_members;
  END IF;
END $$;

-- Simplified user policy: users can only view their own membership rows
DROP POLICY IF EXISTS "Users can view own membership" ON public.workspace_members;
CREATE POLICY "Users can view own membership"
  ON public.workspace_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Note: management of workspace_members is handled by service_role policies
-- defined in 20251128000000_fix_rls_service_role.sql

-- Optional hardening: prevent inserts/updates/deletes by authenticated users
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workspace_members' AND policyname = 'Users can insert membership'
  ) THEN
    DROP POLICY "Users can insert membership" ON public.workspace_members;
  END IF;
END $$;
