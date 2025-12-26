-- Workspaces RLS policies: allow authenticated users to create and view their own workspaces

-- Ensure RLS is enabled
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Idempotent drops
DROP POLICY IF EXISTS "Users can create personal workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view own workspaces" ON public.workspaces;

-- Allow authenticated users to create a workspace they own
CREATE POLICY "Users can create personal workspaces"
  ON public.workspaces FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Allow viewing own workspaces or ones where user is a member
CREATE POLICY "Users can view own workspaces"
  ON public.workspaces FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_members.workspace_id = id 
      AND workspace_members.user_id = auth.uid()
    )
  );

