-- Workspace tenant architecture upgrade.
-- Adds account-scoped billing while keeping workspace_id compatibility for existing billing routes.

CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.account_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner'
    CHECK (role IN ('owner', 'admin', 'manager', 'creator', 'analyst', 'client')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, user_id)
);

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS workflow_mode TEXT NOT NULL DEFAULT 'none'
    CHECK (workflow_mode IN ('none', 'single_stage', 'sequential')),
  ADD COLUMN IF NOT EXISTS approval_settings JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'en-US';

UPDATE public.workspace_members
SET role = CASE role
  WHEN 'guest' THEN 'client'
  WHEN 'viewer' THEN 'analyst'
  WHEN 'editor' THEN 'creator'
  WHEN 'member' THEN 'creator'
  ELSE role
END
WHERE role IN ('guest', 'viewer', 'editor', 'member');

ALTER TABLE public.workspace_members
  DROP CONSTRAINT IF EXISTS workspace_members_role_check;

ALTER TABLE public.workspace_members
  ADD CONSTRAINT workspace_members_role_check
  CHECK (role IN ('owner', 'admin', 'manager', 'creator', 'analyst', 'client'));

DO $$
DECLARE
  ws RECORD;
  account_uuid UUID;
  account_slug TEXT;
BEGIN
  FOR ws IN
    SELECT id, owner_id, name, slug
    FROM public.workspaces
    WHERE account_id IS NULL
  LOOP
    account_slug := COALESCE(NULLIF(ws.slug, ''), 'account') || '-' || substr(replace(ws.owner_id::TEXT, '-', ''), 1, 8);

    SELECT id INTO account_uuid
    FROM public.accounts
    WHERE owner_id = ws.owner_id
    ORDER BY created_at ASC
    LIMIT 1;

    IF account_uuid IS NULL THEN
      INSERT INTO public.accounts (owner_id, name, slug)
      VALUES (
        ws.owner_id,
        COALESCE(NULLIF(ws.name, ''), 'Workspace') || ' Account',
        account_slug
      )
      ON CONFLICT (slug) DO UPDATE SET updated_at = NOW()
      RETURNING id INTO account_uuid;
    END IF;

    UPDATE public.workspaces
    SET account_id = account_uuid
    WHERE id = ws.id;

    INSERT INTO public.account_members (account_id, user_id, role)
    VALUES (account_uuid, ws.owner_id, 'owner')
    ON CONFLICT (account_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  END LOOP;
END $$;

INSERT INTO public.account_members (account_id, user_id, role)
SELECT DISTINCT w.account_id, wm.user_id, wm.role
FROM public.workspace_members wm
JOIN public.workspaces w ON w.id = wm.workspace_id
WHERE w.account_id IS NOT NULL
ON CONFLICT (account_id, user_id) DO NOTHING;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_plan_fkey;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_plan_fkey
  FOREIGN KEY (plan) REFERENCES public.plan_limits(plan);

UPDATE public.subscriptions s
SET account_id = w.account_id
FROM public.workspaces w
WHERE s.workspace_id = w.id
  AND s.account_id IS NULL;

ALTER TABLE public.billing_history
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;

UPDATE public.billing_history bh
SET account_id = w.account_id
FROM public.workspaces w
WHERE bh.workspace_id = w.id
  AND bh.account_id IS NULL;

UPDATE public.plan_limits
SET max_workspaces = 3,
    approval_workflows = TRUE,
    updated_at = NOW()
WHERE plan = 'pro';

CREATE TABLE IF NOT EXISTS public.workspace_posting_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  times TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS public.workspace_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, name)
);

CREATE TABLE IF NOT EXISTS public.workspace_text_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT,
  platforms TEXT[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, name)
);

CREATE TABLE IF NOT EXISTS public.oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  state TEXT NOT NULL UNIQUE,
  redirect_url TEXT,
  pkce_verifier TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes')
);

ALTER TABLE public.content_items
  ADD COLUMN IF NOT EXISTS is_internal_only BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS timezone_snapshot TEXT;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS is_internal_only BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.content_comments
  ADD COLUMN IF NOT EXISTS is_internal_only BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE public.content_comments
SET is_internal_only = (visibility = 'internal')
WHERE is_internal_only IS DISTINCT FROM (visibility = 'internal');

CREATE INDEX IF NOT EXISTS idx_accounts_owner ON public.accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_account_members_user ON public.account_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_account ON public.workspaces(account_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_account ON public.subscriptions(account_id);
CREATE INDEX IF NOT EXISTS idx_workspace_posting_slots_workspace ON public.workspace_posting_slots(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_tags_workspace ON public.workspace_tags(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_text_templates_workspace ON public.workspace_text_templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_oauth_states_user_platform ON public.oauth_states(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON public.oauth_states(expires_at);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_posting_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_text_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_account_member(
  target_account_id UUID,
  allowed_roles TEXT[] DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.account_members am
    WHERE am.account_id = target_account_id
      AND am.user_id = auth.uid()
      AND (allowed_roles IS NULL OR am.role = ANY(allowed_roles))
  );
$$;

DROP POLICY IF EXISTS "Account members can view accounts" ON public.accounts;
CREATE POLICY "Account members can view accounts"
ON public.accounts FOR SELECT
USING (
  owner_id = auth.uid()
  OR public.is_account_member(id)
);

DROP POLICY IF EXISTS "Account owners can manage accounts" ON public.accounts;
CREATE POLICY "Account owners can manage accounts"
ON public.accounts FOR ALL
USING (
  owner_id = auth.uid()
  OR public.is_account_member(id, ARRAY['owner', 'admin'])
)
WITH CHECK (
  owner_id = auth.uid()
  OR public.is_account_member(id, ARRAY['owner', 'admin'])
);

DROP POLICY IF EXISTS "Account members can view account memberships" ON public.account_members;
CREATE POLICY "Account members can view account memberships"
ON public.account_members FOR SELECT
USING (public.is_account_member(account_id));

DROP POLICY IF EXISTS "Account admins can manage account memberships" ON public.account_members;
CREATE POLICY "Account admins can manage account memberships"
ON public.account_members FOR ALL
USING (public.is_account_member(account_id, ARRAY['owner', 'admin']))
WITH CHECK (public.is_account_member(account_id, ARRAY['owner', 'admin']));

DROP POLICY IF EXISTS "Workspace members can view posting slots" ON public.workspace_posting_slots;
CREATE POLICY "Workspace members can view posting slots"
ON public.workspace_posting_slots FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Workspace admins can manage posting slots" ON public.workspace_posting_slots;
CREATE POLICY "Workspace admins can manage posting slots"
ON public.workspace_posting_slots FOR ALL
USING (
  workspace_id IN (
    SELECT workspace_id
    FROM public.workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
  )
)
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id
    FROM public.workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
  )
);

DROP POLICY IF EXISTS "Workspace members can view tags" ON public.workspace_tags;
CREATE POLICY "Workspace members can view tags"
ON public.workspace_tags FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Workspace admins can manage tags" ON public.workspace_tags;
CREATE POLICY "Workspace admins can manage tags"
ON public.workspace_tags FOR ALL
USING (
  workspace_id IN (
    SELECT workspace_id
    FROM public.workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
  )
)
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id
    FROM public.workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
  )
);

DROP POLICY IF EXISTS "Workspace members can view text templates" ON public.workspace_text_templates;
CREATE POLICY "Workspace members can view text templates"
ON public.workspace_text_templates FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Workspace creators can manage text templates" ON public.workspace_text_templates;
CREATE POLICY "Workspace creators can manage text templates"
ON public.workspace_text_templates FOR ALL
USING (
  workspace_id IN (
    SELECT workspace_id
    FROM public.workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'creator')
  )
)
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id
    FROM public.workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'creator')
  )
);

DROP POLICY IF EXISTS "Users can manage own oauth states" ON public.oauth_states;
CREATE POLICY "Users can manage own oauth states"
ON public.oauth_states FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Workspace members can view internal comments" ON public.content_comments;
DROP POLICY IF EXISTS "External users can view external comments" ON public.content_comments;
DROP POLICY IF EXISTS "Workspace members can view comments by role" ON public.content_comments;
CREATE POLICY "Workspace members can view comments by role"
ON public.content_comments FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id
    FROM public.workspace_members
    WHERE user_id = auth.uid()
      AND (
        role IN ('owner', 'admin', 'manager', 'creator', 'analyst')
        OR (role = 'client' AND is_internal_only = FALSE)
      )
  )
);

DROP POLICY IF EXISTS "Workspace members can view media assets" ON public.media_assets;
DROP POLICY IF EXISTS "Workspace members can view media assets by role" ON public.media_assets;
CREATE POLICY "Workspace members can view media assets by role"
ON public.media_assets FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id
    FROM public.workspace_members
    WHERE user_id = auth.uid()
      AND (
        role IN ('owner', 'admin', 'manager', 'creator', 'analyst')
        OR (role = 'client' AND is_internal_only = FALSE)
      )
  )
);
