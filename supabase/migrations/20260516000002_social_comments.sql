CREATE TABLE IF NOT EXISTS public.social_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  social_account_id UUID REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  external_post_id TEXT,
  external_comment_id TEXT NOT NULL,
  parent_external_comment_id TEXT,
  author_name TEXT,
  author_handle TEXT,
  author_avatar TEXT,
  content TEXT NOT NULL DEFAULT '',
  like_count INTEGER NOT NULL DEFAULT 0,
  reply_count INTEGER NOT NULL DEFAULT 0,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_time TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, platform, external_comment_id)
);

CREATE INDEX IF NOT EXISTS idx_social_comments_workspace
  ON public.social_comments(workspace_id);

CREATE INDEX IF NOT EXISTS idx_social_comments_post
  ON public.social_comments(post_id);

CREATE INDEX IF NOT EXISTS idx_social_comments_account
  ON public.social_comments(social_account_id);

CREATE INDEX IF NOT EXISTS idx_social_comments_platform_post
  ON public.social_comments(platform, external_post_id);

ALTER TABLE public.social_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members can view social comments" ON public.social_comments;
CREATE POLICY "Workspace members can view social comments"
ON public.social_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.workspaces w
    LEFT JOIN public.workspace_members wm
      ON wm.workspace_id = w.id
      AND wm.user_id = auth.uid()
    WHERE w.id = social_comments.workspace_id
      AND (w.owner_id = auth.uid() OR wm.user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Workspace members can manage social comments" ON public.social_comments;
CREATE POLICY "Workspace members can manage social comments"
ON public.social_comments FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.workspaces w
    LEFT JOIN public.workspace_members wm
      ON wm.workspace_id = w.id
      AND wm.user_id = auth.uid()
    WHERE w.id = social_comments.workspace_id
      AND (
        w.owner_id = auth.uid()
        OR wm.role IN ('owner', 'admin', 'manager', 'creator')
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.workspaces w
    LEFT JOIN public.workspace_members wm
      ON wm.workspace_id = w.id
      AND wm.user_id = auth.uid()
    WHERE w.id = social_comments.workspace_id
      AND (
        w.owner_id = auth.uid()
        OR wm.role IN ('owner', 'admin', 'manager', 'creator')
      )
  )
);
