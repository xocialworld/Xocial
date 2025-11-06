-- Fix ALL workspace-scoped RLS policies to allow workspace owners to access their data
-- This fixes the critical issue where workspace owners couldn't see any of their data
-- because they aren't automatically added to the workspace_members table

-- ============================================================================
-- SOCIAL ACCOUNTS
-- ============================================================================
DROP POLICY IF EXISTS "Members can view social accounts" ON public.social_accounts;
DROP POLICY IF EXISTS "Editors can manage social accounts" ON public.social_accounts;
DROP POLICY IF EXISTS "Users can view social accounts in their workspaces" ON public.social_accounts;
DROP POLICY IF EXISTS "Workspace owners can manage social accounts" ON public.social_accounts;
DROP POLICY IF EXISTS "Workspace members can view social accounts" ON public.social_accounts;
DROP POLICY IF EXISTS "Workspace members can manage social accounts based on role" ON public.social_accounts;

CREATE POLICY "Owners and members can view social accounts"
    ON public.social_accounts FOR SELECT
    USING (
        workspace_id IN (
            SELECT id FROM public.workspaces 
            WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Owners and editors can manage social accounts"
    ON public.social_accounts FOR ALL
    USING (
        workspace_id IN (
            SELECT id FROM public.workspaces 
            WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
        )
    );

-- ============================================================================
-- POSTS
-- ============================================================================
DROP POLICY IF EXISTS "Members can view posts" ON public.posts;
DROP POLICY IF EXISTS "Editors can create posts" ON public.posts;
DROP POLICY IF EXISTS "Editors can update posts" ON public.posts;
DROP POLICY IF EXISTS "Editors can delete posts" ON public.posts;

CREATE POLICY "Owners and members can view posts"
    ON public.posts FOR SELECT
    USING (
        workspace_id IN (
            SELECT id FROM public.workspaces 
            WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Owners and editors can create posts"
    ON public.posts FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT id FROM public.workspaces 
            WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
        )
    );

CREATE POLICY "Owners and editors can update posts"
    ON public.posts FOR UPDATE
    USING (
        workspace_id IN (
            SELECT id FROM public.workspaces 
            WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
        )
    );

CREATE POLICY "Owners and editors can delete posts"
    ON public.posts FOR DELETE
    USING (
        workspace_id IN (
            SELECT id FROM public.workspaces 
            WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
        )
    );

-- ============================================================================
-- POST ANALYTICS
-- ============================================================================
DROP POLICY IF EXISTS "Members can view post analytics" ON public.post_analytics;

CREATE POLICY "Owners and members can view post analytics"
    ON public.post_analytics FOR SELECT
    USING (
        post_id IN (
            SELECT id FROM public.posts 
            WHERE workspace_id IN (
                SELECT id FROM public.workspaces 
                WHERE owner_id = auth.uid()
                UNION
                SELECT workspace_id FROM public.workspace_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- ============================================================================
-- COMMENTS
-- ============================================================================
DROP POLICY IF EXISTS "Members can view comments" ON public.comments;

CREATE POLICY "Owners and members can view comments"
    ON public.comments FOR SELECT
    USING (
        post_id IN (
            SELECT id FROM public.posts 
            WHERE workspace_id IN (
                SELECT id FROM public.workspaces 
                WHERE owner_id = auth.uid()
                UNION
                SELECT workspace_id FROM public.workspace_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- ============================================================================
-- AI GENERATIONS
-- ============================================================================
DROP POLICY IF EXISTS "Members can view ai generations" ON public.ai_generations;
DROP POLICY IF EXISTS "Members can create ai generations" ON public.ai_generations;

CREATE POLICY "Owners and members can view ai generations"
    ON public.ai_generations FOR SELECT
    USING (
        workspace_id IN (
            SELECT id FROM public.workspaces 
            WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Owners and members can create ai generations"
    ON public.ai_generations FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT id FROM public.workspaces 
            WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- STRATEGY RECOMMENDATIONS
-- ============================================================================
DROP POLICY IF EXISTS "Members can view strategy recommendations" ON public.strategy_recommendations;

CREATE POLICY "Owners and members can view strategy recommendations"
    ON public.strategy_recommendations FOR SELECT
    USING (
        workspace_id IN (
            SELECT id FROM public.workspaces 
            WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- API CALL LOGS
-- ============================================================================
DROP POLICY IF EXISTS "Members can view api logs" ON public.api_call_logs;

CREATE POLICY "Owners and members can view api logs"
    ON public.api_call_logs FOR SELECT
    USING (
        workspace_id IN (
            SELECT id FROM public.workspaces 
            WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- CAMPAIGNS
-- ============================================================================
DROP POLICY IF EXISTS "Members can view campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Editors can manage campaigns" ON public.campaigns;

CREATE POLICY "Owners and members can view campaigns"
    ON public.campaigns FOR SELECT
    USING (
        workspace_id IN (
            SELECT id FROM public.workspaces 
            WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Owners and editors can manage campaigns"
    ON public.campaigns FOR ALL
    USING (
        workspace_id IN (
            SELECT id FROM public.workspaces 
            WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
        )
    );

-- ============================================================================
-- MEDIA (from 20251030000000_add_media_table.sql)
-- ============================================================================
DROP POLICY IF EXISTS "Users can view media in their workspace" ON public.media;
DROP POLICY IF EXISTS "Users can upload media to their workspace" ON public.media;

CREATE POLICY "Owners and members can view media"
    ON public.media FOR SELECT
    USING (
        workspace_id IN (
            SELECT id FROM public.workspaces 
            WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Owners and members can upload media"
    ON public.media FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT id FROM public.workspaces 
            WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- POST MEDIA (from 20251030000000_add_media_table.sql)
-- ============================================================================
DROP POLICY IF EXISTS "Users can view post media" ON public.post_media;
DROP POLICY IF EXISTS "Users can manage post media" ON public.post_media;

CREATE POLICY "Owners and members can view post media"
    ON public.post_media FOR SELECT
    USING (
        post_id IN (
            SELECT id FROM public.posts 
            WHERE workspace_id IN (
                SELECT id FROM public.workspaces 
                WHERE owner_id = auth.uid()
                UNION
                SELECT workspace_id FROM public.workspace_members 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Owners and editors can manage post media"
    ON public.post_media FOR ALL
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
    );

-- ============================================================================
-- TEMPLATES (from 20251031000000_add_strategy_and_templates.sql)
-- ============================================================================
DROP POLICY IF EXISTS "Users can view templates in their workspace" ON public.templates;
DROP POLICY IF EXISTS "Users can create templates" ON public.templates;

CREATE POLICY "Owners and members can view templates"
    ON public.templates FOR SELECT
    USING (
        workspace_id IN (
            SELECT id FROM public.workspaces 
            WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Owners and members can create templates"
    ON public.templates FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT id FROM public.workspaces 
            WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM public.workspace_members 
            WHERE user_id = auth.uid()
        )
    );

