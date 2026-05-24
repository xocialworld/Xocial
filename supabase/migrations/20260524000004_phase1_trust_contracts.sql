-- Phase 1 trust and public interface contracts.
-- Adds durable job/publish evidence and post activity records used by the
-- dashboard, post detail page, readiness checks, and scheduler monitoring.

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS next_publish_attempt_at timestamptz;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS last_publish_error text;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS publish_attempts integer DEFAULT 0;

CREATE INDEX IF NOT EXISTS posts_due_scheduled_idx
  ON public.posts (scheduled_at, id)
  WHERE status = 'scheduled' AND scheduled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS posts_next_publish_attempt_idx
  ON public.posts (next_publish_attempt_at, id)
  WHERE status = 'scheduled' AND next_publish_attempt_at IS NOT NULL;

ALTER TABLE public.platform_posts
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.platform_posts
  ADD COLUMN IF NOT EXISTS error_message text;

ALTER TABLE public.platform_posts
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz;

ALTER TABLE public.platform_posts
  ADD COLUMN IF NOT EXISTS attempt_count integer DEFAULT 0;

ALTER TABLE public.platform_posts
  ADD COLUMN IF NOT EXISTS raw_response jsonb DEFAULT '{}'::jsonb;

UPDATE public.platform_posts pp
SET workspace_id = p.workspace_id
FROM public.posts p
WHERE pp.post_id = p.id
  AND pp.workspace_id IS NULL;

CREATE INDEX IF NOT EXISTS platform_posts_workspace_published_idx
  ON public.platform_posts (workspace_id, published_at DESC);

CREATE INDEX IF NOT EXISTS platform_posts_post_platform_idx
  ON public.platform_posts (post_id, platform);

DO $$
BEGIN
  DELETE FROM public.platform_posts pp
  USING (
    SELECT
      ctid,
      row_number() OVER (
        PARTITION BY post_id, social_account_id, platform
        ORDER BY published_at DESC NULLS LAST, ctid DESC
      ) AS duplicate_rank
    FROM public.platform_posts
    WHERE post_id IS NOT NULL
      AND social_account_id IS NOT NULL
  ) ranked
  WHERE pp.ctid = ranked.ctid
    AND ranked.duplicate_rank > 1;
END $$;

DROP INDEX IF EXISTS platform_posts_post_account_platform_unique;
CREATE UNIQUE INDEX platform_posts_post_account_platform_unique
  ON public.platform_posts (post_id, social_account_id, platform);

-- Do not enforce uniqueness on (social_account_id, platform, platform_post_id).
-- Existing sync data can contain duplicate external evidence rows, while the app
-- only needs the post/account/platform uniqueness above for publish evidence upserts.

ALTER TABLE public.post_analytics
  ADD COLUMN IF NOT EXISTS social_account_id uuid REFERENCES public.social_accounts(id) ON DELETE SET NULL;

ALTER TABLE public.post_analytics
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

ALTER TABLE public.post_analytics
  ADD COLUMN IF NOT EXISTS raw jsonb DEFAULT '{}'::jsonb;

-- Keep post_analytics append-friendly. The existing schema stores analytics
-- snapshots over time using (post_id, platform, fetched_at), so enforcing
-- uniqueness on only (post_id, platform) would destroy history and fail on
-- existing data.

CREATE INDEX IF NOT EXISTS post_analytics_account_platform_synced_idx
  ON public.post_analytics (social_account_id, platform, last_synced_at DESC);

ALTER TABLE public.external_posts
  ADD COLUMN IF NOT EXISTS post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS external_posts_workspace_platform_published_idx
  ON public.external_posts (workspace_id, platform, published_at DESC);

ALTER TABLE public.content_comments
  ADD COLUMN IF NOT EXISTS post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE;

UPDATE public.content_comments cc
SET post_id = p.id
FROM public.posts p
WHERE cc.post_id IS NULL
  AND cc.content_item_id = p.id;

CREATE INDEX IF NOT EXISTS content_comments_workspace_post_created_idx
  ON public.content_comments (workspace_id, post_id, created_at);

CREATE TABLE IF NOT EXISTS public.job_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  job_type text NOT NULL,
  status text NOT NULL CHECK (status IN ('running', 'succeeded', 'partial', 'failed')),
  trigger text NOT NULL DEFAULT 'system',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms integer,
  processed_count integer DEFAULT 0,
  succeeded_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  retry_count integer DEFAULT 0,
  correlation_id text,
  error_code text,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_runs_workspace_started_idx
  ON public.job_runs (workspace_id, started_at DESC);

CREATE INDEX IF NOT EXISTS job_runs_type_started_idx
  ON public.job_runs (job_type, started_at DESC);

CREATE INDEX IF NOT EXISTS job_runs_status_started_idx
  ON public.job_runs (status, started_at DESC);

CREATE TABLE IF NOT EXISTS public.post_activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'system',
  event_type text NOT NULL,
  platform text,
  social_account_id uuid REFERENCES public.social_accounts(id) ON DELETE SET NULL,
  platform_post_id text,
  job_run_id uuid REFERENCES public.job_runs(id) ON DELETE SET NULL,
  status_before text,
  status_after text,
  message text,
  error_code text,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS post_activity_events_post_occurred_idx
  ON public.post_activity_events (workspace_id, post_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS post_activity_events_type_occurred_idx
  ON public.post_activity_events (workspace_id, event_type, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.post_publish_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  platform text NOT NULL,
  social_account_id uuid REFERENCES public.social_accounts(id) ON DELETE SET NULL,
  attempt_no integer NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'published', 'failed', 'skipped')),
  provider_request_id text,
  platform_post_id text,
  permalink text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  duration_ms integer,
  retryable boolean DEFAULT false,
  error_code text,
  error_message text,
  job_run_id uuid REFERENCES public.job_runs(id) ON DELETE SET NULL,
  request_fingerprint text,
  response_metadata jsonb DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS post_publish_attempts_post_platform_attempt_unique
  ON public.post_publish_attempts (post_id, platform, attempt_no);

CREATE INDEX IF NOT EXISTS post_publish_attempts_post_started_idx
  ON public.post_publish_attempts (workspace_id, post_id, started_at DESC);

CREATE INDEX IF NOT EXISTS post_publish_attempts_status_started_idx
  ON public.post_publish_attempts (workspace_id, status, started_at DESC);

ALTER TABLE public.social_accounts
  ADD COLUMN IF NOT EXISTS last_sync_status text;

ALTER TABLE public.social_accounts
  ADD COLUMN IF NOT EXISTS last_sync_error text;

ALTER TABLE public.social_accounts
  ADD COLUMN IF NOT EXISTS last_sync_job_run_id uuid REFERENCES public.job_runs(id) ON DELETE SET NULL;

ALTER TABLE public.social_accounts
  ADD COLUMN IF NOT EXISTS last_publish_error text;

ALTER TABLE public.social_accounts
  ADD COLUMN IF NOT EXISTS health_status text DEFAULT 'unknown';

ALTER TABLE public.job_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_publish_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members can read job runs" ON public.job_runs;
CREATE POLICY "Workspace members can read job runs"
  ON public.job_runs FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Workspace members can read post activity" ON public.post_activity_events;
CREATE POLICY "Workspace members can read post activity"
  ON public.post_activity_events FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Workspace members can read publish attempts" ON public.post_publish_attempts;
CREATE POLICY "Workspace members can read publish attempts"
  ON public.post_publish_attempts FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );
