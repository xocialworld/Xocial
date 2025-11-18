-- Migration: 20251114090000_add_rls_helpers.sql
-- Purpose : Align RLS policies with SRS helper functions (user_workspaces + has_workspace_permission)

SET search_path = public;

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper Functions
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.user_workspaces(user_uuid UUID)
RETURNS SETOF UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT wm.workspace_id
  FROM public.workspace_members wm
  WHERE wm.user_id = user_uuid
  UNION
  SELECT w.id
  FROM public.workspaces w
  WHERE w.owner_id = user_uuid;
$$;

REVOKE ALL ON FUNCTION public.user_workspaces(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_workspaces(UUID) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.has_workspace_permission(
  workspace_uuid UUID,
  user_uuid UUID,
  required_role TEXT DEFAULT 'viewer'
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH member_role AS (
    SELECT
      CASE
        WHEN w.owner_id = user_uuid THEN 'owner'
        ELSE wm.role
      END AS role
    FROM public.workspaces w
    LEFT JOIN public.workspace_members wm
      ON wm.workspace_id = w.id
     AND wm.user_id = user_uuid
    WHERE w.id = workspace_uuid
  )
  SELECT EXISTS (
    SELECT 1
    FROM member_role
    WHERE
      CASE required_role
        WHEN 'owner' THEN role = 'owner'
        WHEN 'admin' THEN role IN ('owner', 'admin')
        WHEN 'editor' THEN role IN ('owner', 'admin', 'editor')
        WHEN 'viewer' THEN role IN ('owner', 'admin', 'editor', 'viewer')
        ELSE FALSE
      END
  );
$$;

REVOKE ALL ON FUNCTION public.has_workspace_permission(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_workspace_permission(UUID, UUID, TEXT) TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- PROFILES RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────────────────────
-- WORKSPACES RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_select_by_owner" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_insert_own" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_update_own" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_delete_own" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view their workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Owners can update workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Owners can delete workspaces" ON public.workspaces;

CREATE POLICY "Users can view their workspaces"
  ON public.workspaces FOR SELECT
  USING (
    id IN (SELECT public.user_workspaces(auth.uid()))
    OR owner_id = auth.uid()
  );

CREATE POLICY "Users can create workspaces"
  ON public.workspaces FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update workspaces"
  ON public.workspaces FOR UPDATE
  USING (public.has_workspace_permission(id, auth.uid(), 'owner'));

CREATE POLICY "Owners can delete workspaces"
  ON public.workspaces FOR DELETE
  USING (owner_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- WORKSPACE_MEMBERS RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_members_select" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_update" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Owners and admins can manage members" ON public.workspace_members;

CREATE POLICY "Users can view workspace members"
  ON public.workspace_members FOR SELECT
  USING (public.has_workspace_permission(workspace_id, auth.uid(), 'viewer'));

CREATE POLICY "Owners and admins can manage members"
  ON public.workspace_members FOR INSERT
  WITH CHECK (public.has_workspace_permission(workspace_id, auth.uid(), 'admin'));

CREATE POLICY "Owners and admins can update members"
  ON public.workspace_members FOR UPDATE
  USING (public.has_workspace_permission(workspace_id, auth.uid(), 'admin'));

CREATE POLICY "Owners and admins can delete members"
  ON public.workspace_members FOR DELETE
  USING (public.has_workspace_permission(workspace_id, auth.uid(), 'admin'));

-- ─────────────────────────────────────────────────────────────────────────────
-- SOCIAL_ACCOUNTS RLS
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DROP POLICY IF EXISTS "Owners and editors can manage social accounts" ON public.social_accounts;
DROP POLICY IF EXISTS "Social accounts select" ON public.social_accounts;

CREATE POLICY "Users can view workspace social accounts"
  ON public.social_accounts FOR SELECT
  USING (public.has_workspace_permission(workspace_id, auth.uid(), 'viewer'));

CREATE POLICY "Editors can manage social accounts"
  ON public.social_accounts FOR ALL
  USING (public.has_workspace_permission(workspace_id, auth.uid(), 'editor'))
  WITH CHECK (public.has_workspace_permission(workspace_id, auth.uid(), 'editor'));

-- ─────────────────────────────────────────────────────────────────────────────
-- POSTS RLS
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DROP POLICY IF EXISTS "Posts select" ON public.posts;
DROP POLICY IF EXISTS "Posts insert" ON public.posts;
DROP POLICY IF EXISTS "Posts update" ON public.posts;
DROP POLICY IF EXISTS "Posts delete" ON public.posts;

CREATE POLICY "Users can view workspace posts"
  ON public.posts FOR SELECT
  USING (public.has_workspace_permission(workspace_id, auth.uid(), 'viewer'));

CREATE POLICY "Editors can create posts"
  ON public.posts FOR INSERT
  WITH CHECK (public.has_workspace_permission(workspace_id, auth.uid(), 'editor'));

CREATE POLICY "Editors can update posts"
  ON public.posts FOR UPDATE
  USING (public.has_workspace_permission(workspace_id, auth.uid(), 'editor'));

CREATE POLICY "Editors can delete posts"
  ON public.posts FOR DELETE
  USING (public.has_workspace_permission(workspace_id, auth.uid(), 'editor'));

-- ─────────────────────────────────────────────────────────────────────────────
-- POST ANALYTICS RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.post_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Post analytics select" ON public.post_analytics;

CREATE POLICY "Users can view analytics for workspace posts"
  ON public.post_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.posts
      WHERE posts.id = post_analytics.post_id
        AND public.has_workspace_permission(posts.workspace_id, auth.uid(), 'viewer')
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- MEDIA RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Media select" ON public.media;
DROP POLICY IF EXISTS "Media insert" ON public.media;
DROP POLICY IF EXISTS "Media delete" ON public.media;

CREATE POLICY "Users can view workspace media"
  ON public.media FOR SELECT
  USING (public.has_workspace_permission(workspace_id, auth.uid(), 'viewer'));

CREATE POLICY "Editors can upload media"
  ON public.media FOR INSERT
  WITH CHECK (public.has_workspace_permission(workspace_id, auth.uid(), 'editor'));

CREATE POLICY "Editors can delete media"
  ON public.media FOR DELETE
  USING (public.has_workspace_permission(workspace_id, auth.uid(), 'editor'));

-- ─────────────────────────────────────────────────────────────────────────────
-- CONTENT_TEMPLATES RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.content_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Templates select" ON public.content_templates;
DROP POLICY IF EXISTS "Templates insert" ON public.content_templates;
DROP POLICY IF EXISTS "Templates update" ON public.content_templates;
DROP POLICY IF EXISTS "Templates delete" ON public.content_templates;

CREATE POLICY "Users can view workspace templates"
  ON public.content_templates FOR SELECT
  USING (public.has_workspace_permission(workspace_id, auth.uid(), 'viewer'));

CREATE POLICY "Editors can manage templates"
  ON public.content_templates FOR ALL
  USING (public.has_workspace_permission(workspace_id, auth.uid(), 'editor'))
  WITH CHECK (public.has_workspace_permission(workspace_id, auth.uid(), 'editor'));

-- ─────────────────────────────────────────────────────────────────────────────
-- AI_GENERATIONS RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "AI generations select" ON public.ai_generations;
DROP POLICY IF EXISTS "AI generations insert" ON public.ai_generations;

CREATE POLICY "Users can view workspace AI generations"
  ON public.ai_generations FOR SELECT
  USING (public.has_workspace_permission(workspace_id, auth.uid(), 'viewer'));

CREATE POLICY "Editors can create AI generations"
  ON public.ai_generations FOR INSERT
  WITH CHECK (public.has_workspace_permission(workspace_id, auth.uid(), 'editor'));

-- ─────────────────────────────────────────────────────────────────────────────
-- WEBHOOK EVENTS RLS (service role only)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "webhook_events_select" ON public.webhook_events;
DROP POLICY IF EXISTS "webhook_events_insert" ON public.webhook_events;

-- No public policies: only service_role can access webhook_events


