-- Fix infinite recursion in workspace_members RLS policies
-- Migration: 20251106000000_fix_workspace_members_rls.sql
-- Description: Remove circular reference in workspace_members policies

DO $migration$
DECLARE
  table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'workspace_members'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE NOTICE 'workspace_members table not found; skipping RLS migration.';
    RETURN;
  END IF;

  DROP POLICY IF EXISTS "Members can view workspace members" ON public.workspace_members;
  DROP POLICY IF EXISTS "Owners and admins can manage members" ON public.workspace_members;
  DROP POLICY IF EXISTS "Workspace owners can manage members" ON public.workspace_members;
  DROP POLICY IF EXISTS "Users can join as members" ON public.workspace_members;
  DROP POLICY IF EXISTS "Users can view workspace members" ON public.workspace_members;

  ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Users can view workspace members"
      ON public.workspace_members FOR SELECT
      USING (
          workspace_id IN (
              SELECT id FROM public.workspaces 
              WHERE owner_id = auth.uid()
          )
          OR user_id = auth.uid()
      );

  CREATE POLICY "Workspace owners can manage members"
      ON public.workspace_members FOR ALL
      USING (
          workspace_id IN (
              SELECT id FROM public.workspaces 
              WHERE owner_id = auth.uid()
          )
      );

  CREATE POLICY "Users can join as members"
      ON public.workspace_members FOR INSERT
      WITH CHECK (user_id = auth.uid());
END;
$migration$;

