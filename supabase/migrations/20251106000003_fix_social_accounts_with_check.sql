-- Ensure workspace owners and editors can insert/update social_accounts
DROP POLICY IF EXISTS "Owners and editors can manage social accounts" ON public.social_accounts;

CREATE POLICY "Owners and editors can manage social accounts"
    ON public.social_accounts
    FOR ALL
    USING (
        workspace_id IN (
            SELECT id FROM public.workspaces
            WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
        )
    )
    WITH CHECK (
        workspace_id IN (
            SELECT id FROM public.workspaces
            WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
        )
    );

-- Ensure workspace owners and editors can manage campaigns
DROP POLICY IF EXISTS "Owners and editors can manage campaigns" ON public.campaigns;

CREATE POLICY "Owners and editors can manage campaigns"
    ON public.campaigns
    FOR ALL
    USING (
        workspace_id IN (
            SELECT id FROM public.workspaces
            WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
        )
    )
    WITH CHECK (
        workspace_id IN (
            SELECT id FROM public.workspaces
            WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
        )
    );

-- Ensure workspace owners and editors can manage post media entries
DROP POLICY IF EXISTS "Owners and editors can manage post media" ON public.post_media;

CREATE POLICY "Owners and editors can manage post media"
    ON public.post_media
    FOR ALL
    USING (
        post_id IN (
            SELECT id FROM public.posts
            WHERE workspace_id IN (
                SELECT id FROM public.workspaces
                WHERE owner_id = auth.uid()
                UNION
                SELECT workspace_id FROM public.workspace_members
                WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
            )
        )
    )
    WITH CHECK (
        post_id IN (
            SELECT id FROM public.posts
            WHERE workspace_id IN (
                SELECT id FROM public.workspaces
                WHERE owner_id = auth.uid()
                UNION
                SELECT workspace_id FROM public.workspace_members
                WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
            )
        )
    );

