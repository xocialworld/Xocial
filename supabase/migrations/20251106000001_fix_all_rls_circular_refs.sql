-- Fix ALL infinite recursion issues in RLS policies
-- Migration: 20251106000001_fix_all_rls_circular_refs.sql
-- Description: Break circular dependencies between workspaces and workspace_members

-- ============================================================================
-- STEP 1: Drop all problematic policies
-- ============================================================================

-- Drop OLD workspace policies
DROP POLICY IF EXISTS "Users can view own workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Owners can update their workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Owners can delete their workspaces" ON public.workspaces;

-- Drop NEW workspace policies (in case migration was partially applied)
DROP POLICY IF EXISTS "workspace_select_by_owner" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_insert_own" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_update_own" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_delete_own" ON public.workspaces;

-- Drop OLD workspace_members policies
DROP POLICY IF EXISTS "Members can view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Owners and admins can manage members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners can manage members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can join as members" ON public.workspace_members;

-- Drop NEW workspace_members policies (in case migration was partially applied)
DROP POLICY IF EXISTS "workspace_members_select" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_update" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete" ON public.workspace_members;

-- ============================================================================
-- STEP 2: Create WORKSPACES policies (no circular reference)
-- ============================================================================

-- Users can view workspaces they own (simple, no subquery)
CREATE POLICY "workspace_select_by_owner"
    ON public.workspaces FOR SELECT
    USING (owner_id = auth.uid());

-- Users can create workspaces
CREATE POLICY "workspace_insert_own"
    ON public.workspaces FOR INSERT
    WITH CHECK (owner_id = auth.uid());

-- Owners can update their workspaces
CREATE POLICY "workspace_update_own"
    ON public.workspaces FOR UPDATE
    USING (owner_id = auth.uid());

-- Owners can delete their workspaces
CREATE POLICY "workspace_delete_own"
    ON public.workspaces FOR DELETE
    USING (owner_id = auth.uid());

-- ============================================================================
-- STEP 3: Create WORKSPACE_MEMBERS policies (using workspaces, not circular)
-- ============================================================================

-- Users can view members of workspaces they own
CREATE POLICY "workspace_members_select"
    ON public.workspace_members FOR SELECT
    USING (
        user_id = auth.uid() 
        OR workspace_id IN (
            SELECT id FROM public.workspaces 
            WHERE owner_id = auth.uid()
        )
    );

-- Workspace owners can insert members
CREATE POLICY "workspace_members_insert"
    ON public.workspace_members FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT id FROM public.workspaces 
            WHERE owner_id = auth.uid()
        )
    );

-- Workspace owners can update members
CREATE POLICY "workspace_members_update"
    ON public.workspace_members FOR UPDATE
    USING (
        workspace_id IN (
            SELECT id FROM public.workspaces 
            WHERE owner_id = auth.uid()
        )
    );

-- Workspace owners can delete members
CREATE POLICY "workspace_members_delete"
    ON public.workspace_members FOR DELETE
    USING (
        workspace_id IN (
            SELECT id FROM public.workspaces 
            WHERE owner_id = auth.uid()
        )
    );

