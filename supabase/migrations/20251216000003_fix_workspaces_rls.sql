-- Fix RLS restrictions preventing users from listing their own workspaces
-- Previously, the EXISTS clause was malformed (comparing workspace_members.workspace_id to workspace_members.id)

BEGIN;

-- Drop incorrect policy for selecting workspaces
DROP POLICY IF EXISTS "Users can view own workspaces" ON public.workspaces;

-- Create corrected policy for selecting workspaces
CREATE POLICY "Users can view own workspaces"
ON public.workspaces
FOR SELECT
TO authenticated
USING (
  (owner_id = auth.uid()) OR 
  (EXISTS (
    SELECT 1 
    FROM public.workspace_members 
    WHERE workspace_members.workspace_id = workspaces.id 
    AND workspace_members.user_id = auth.uid()
  ))
);

COMMIT;
