-- Fix ALL infinite recursion issues in RLS policies
-- Migration: 20251106000001_fix_all_rls_circular_refs.sql
-- Description: Break circular dependencies between workspaces and workspace_members
-- Idempotent & rerunnable (safe guards for missing tables and repeated runs)

DO $migration$
DECLARE
  has_workspaces BOOLEAN;
  has_workspace_members BOOLEAN;
  policy_name TEXT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'workspaces'
  ) INTO has_workspaces;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'workspace_members'
  ) INTO has_workspace_members;

  IF NOT has_workspaces OR NOT has_workspace_members THEN
    RAISE NOTICE 'Skipping 20251106000001_fix_all_rls_circular_refs (workspaces: %, workspace_members: %)',
      has_workspaces, has_workspace_members;
    RETURN;
  END IF;

  -- Drop workspace policies safely
  FOREACH policy_name IN ARRAY ARRAY[
    'Users can view own workspaces',
    'Users can create workspaces',
    'Owners can update their workspaces',
    'Owners can delete their workspaces',
    'workspace_select_by_owner',
    'workspace_insert_own',
    'workspace_update_own',
    'workspace_delete_own'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.workspaces;', policy_name);
  END LOOP;

  -- Drop workspace_members policies safely
  FOREACH policy_name IN ARRAY ARRAY[
    'Members can view workspace members',
    'Owners and admins can manage members',
    'Users can view workspace members',
    'Workspace owners can manage members',
    'Users can join as members',
    'workspace_members_select',
    'workspace_members_insert',
    'workspace_members_update',
    'workspace_members_delete'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.workspace_members;', policy_name);
  END LOOP;

  -- Recreate workspace policies
  EXECUTE $sql$
    CREATE POLICY "workspace_select_by_owner"
      ON public.workspaces FOR SELECT
      USING (owner_id = auth.uid());
  $sql$;

  EXECUTE $sql$
    CREATE POLICY "workspace_insert_own"
      ON public.workspaces FOR INSERT
      WITH CHECK (owner_id = auth.uid());
  $sql$;

  EXECUTE $sql$
    CREATE POLICY "workspace_update_own"
      ON public.workspaces FOR UPDATE
      USING (owner_id = auth.uid());
  $sql$;

  EXECUTE $sql$
    CREATE POLICY "workspace_delete_own"
      ON public.workspaces FOR DELETE
      USING (owner_id = auth.uid());
  $sql$;

  -- Recreate workspace_members policies
  EXECUTE $sql$
    CREATE POLICY "workspace_members_select"
      ON public.workspace_members FOR SELECT
      USING (
          user_id = auth.uid()
          OR workspace_id IN (
              SELECT id FROM public.workspaces
              WHERE owner_id = auth.uid()
          )
      );
  $sql$;

  EXECUTE $sql$
    CREATE POLICY "workspace_members_insert"
      ON public.workspace_members FOR INSERT
      WITH CHECK (
          workspace_id IN (
              SELECT id FROM public.workspaces
              WHERE owner_id = auth.uid()
          )
      );
  $sql$;

  EXECUTE $sql$
    CREATE POLICY "workspace_members_update"
      ON public.workspace_members FOR UPDATE
      USING (
          workspace_id IN (
              SELECT id FROM public.workspaces
              WHERE owner_id = auth.uid()
          )
      );
  $sql$;

  EXECUTE $sql$
    CREATE POLICY "workspace_members_delete"
      ON public.workspace_members FOR DELETE
      USING (
          workspace_id IN (
              SELECT id FROM public.workspaces
              WHERE owner_id = auth.uid()
          )
      );
  $sql$;
END;
$migration$;

