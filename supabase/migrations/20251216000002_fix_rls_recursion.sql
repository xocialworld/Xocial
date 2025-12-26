-- Create a secure function to check workspace membership
-- This avoids RLS recursion by using SECURITY DEFINER (runs as superuser/owner)
CREATE OR REPLACE FUNCTION public.check_workspace_access(param_workspace_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.workspace_members 
    WHERE workspace_id = param_workspace_id 
    AND user_id = auth.uid()
  );
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.check_workspace_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_workspace_access(uuid) TO service_role;

-- Enable RLS on social_accounts
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;

-- Ensure authenticated users have table-level permissions (RLS will restrict rows)
GRANT ALL ON TABLE public.social_accounts TO authenticated;
GRANT ALL ON TABLE public.social_accounts TO service_role;

-- Update View Policy
DROP POLICY IF EXISTS "view_social_accounts_member" ON public.social_accounts;
CREATE POLICY "view_social_accounts_member"
ON public.social_accounts FOR SELECT TO authenticated
USING (
    public.check_workspace_access(workspace_id)
);

-- Update Manage Policy
DROP POLICY IF EXISTS "manage_social_accounts_member" ON public.social_accounts;
CREATE POLICY "manage_social_accounts_member"
ON public.social_accounts FOR ALL TO authenticated
USING (
    public.check_workspace_access(workspace_id)
)
WITH CHECK (
    public.check_workspace_access(workspace_id)
);
