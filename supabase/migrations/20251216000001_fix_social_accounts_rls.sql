-- Security hardening and access fixes for social_accounts

-- Enable RLS
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;

-- 1. View Access
-- Users can view social accounts linked to workspaces they are members of.
DROP POLICY IF EXISTS "view_social_accounts_member" ON public.social_accounts;
CREATE POLICY "view_social_accounts_member"
ON public.social_accounts FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = social_accounts.workspace_id
        AND wm.user_id = auth.uid()
    )
);

-- 2. Management Access
-- Users can insert/update/delete social accounts in workspaces they are members of.
DROP POLICY IF EXISTS "manage_social_accounts_member" ON public.social_accounts;
CREATE POLICY "manage_social_accounts_member"
ON public.social_accounts FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = social_accounts.workspace_id
        AND wm.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = social_accounts.workspace_id
        AND wm.user_id = auth.uid()
    )
);
