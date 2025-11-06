-- Fix infinite recursion in workspace_members RLS policies
-- Migration: 20251106000000_fix_workspace_members_rls.sql
-- Description: Remove circular reference in workspace_members policies

-- Drop the problematic policies
DROP POLICY IF EXISTS "Members can view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Owners and admins can manage members" ON public.workspace_members;

-- Create new policies without circular reference
-- Allow users to view members of workspaces they own
CREATE POLICY "Users can view workspace members"
    ON public.workspace_members FOR SELECT
    USING (
        workspace_id IN (
            SELECT id FROM public.workspaces 
            WHERE owner_id = auth.uid()
        )
        OR user_id = auth.uid()
    );

-- Allow workspace owners to manage members
CREATE POLICY "Workspace owners can manage members"
    ON public.workspace_members FOR ALL
    USING (
        workspace_id IN (
            SELECT id FROM public.workspaces 
            WHERE owner_id = auth.uid()
        )
    );

-- Allow users to insert themselves as members (for workspace creation)
CREATE POLICY "Users can join as members"
    ON public.workspace_members FOR INSERT
    WITH CHECK (user_id = auth.uid());

