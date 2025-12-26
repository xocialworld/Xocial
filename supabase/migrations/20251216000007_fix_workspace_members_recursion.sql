BEGIN;

-- Drop the recursive policy that causes 500 errors
DROP POLICY IF EXISTS "Users can view own membership" ON public.workspace_members;

-- Create non-recursive policy using the existing SECURITY DEFINER function
-- This allows users to view:
-- 1. Their own membership row (user_id = auth.uid())
-- 2. Membership rows of other users in workspaces they belong to (via check_workspace_access)
CREATE POLICY "Users can view own membership"
  ON public.workspace_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    public.check_workspace_access(workspace_id)
  );

COMMIT;
