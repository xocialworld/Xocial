-- Xocial AI / Leverage foundation.
-- Adds the durable learning substrate used by Brand Brain, Leverage,
-- background AI workers, and explainable recommendations.

CREATE TABLE IF NOT EXISTS public.strategy_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'content',
  title text NOT NULL,
  description text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  confidence_score numeric DEFAULT 0,
  action_items jsonb DEFAULT '[]'::jsonb,
  metrics jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,
  implemented_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.strategy_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  recommendation_type text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS strategy_recommendations_workspace_status_idx
  ON public.strategy_recommendations (workspace_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS strategy_cache_workspace_type_expires_idx
  ON public.strategy_cache (workspace_id, recommendation_type, expires_at DESC);

CREATE TABLE IF NOT EXISTS public.learning_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'system',
  event_type text NOT NULL,
  entity_type text,
  entity_id text,
  platform text,
  signal_strength numeric DEFAULT 1,
  metadata jsonb DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS learning_events_workspace_occurred_idx
  ON public.learning_events (workspace_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS learning_events_entity_idx
  ON public.learning_events (workspace_id, entity_type, entity_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS learning_events_type_idx
  ON public.learning_events (workspace_id, event_type, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_model_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  feature text NOT NULL,
  prompt_version text,
  model text,
  input_hash text,
  input_payload jsonb DEFAULT '{}'::jsonb,
  output_payload jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'succeeded',
  token_usage integer DEFAULT 0,
  latency_ms integer DEFAULT 0,
  entity_type text,
  entity_id text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_model_runs_workspace_created_idx
  ON public.ai_model_runs (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_model_runs_feature_created_idx
  ON public.ai_model_runs (workspace_id, feature, created_at DESC);

CREATE TABLE IF NOT EXISTS public.workspace_brand_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  voice text DEFAULT '',
  audience text DEFAULT '',
  products_offers jsonb DEFAULT '[]'::jsonb,
  content_pillars jsonb DEFAULT '[]'::jsonb,
  competitors jsonb DEFAULT '[]'::jsonb,
  do_rules jsonb DEFAULT '[]'::jsonb,
  dont_rules jsonb DEFAULT '[]'::jsonb,
  approved_examples jsonb DEFAULT '[]'::jsonb,
  rejected_examples jsonb DEFAULT '[]'::jsonb,
  platform_preferences jsonb DEFAULT '{}'::jsonb,
  knowledge_settings jsonb DEFAULT '{}'::jsonb,
  confidence_score numeric DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  document_type text NOT NULL DEFAULT 'note',
  source_entity_type text,
  source_entity_id text,
  content text DEFAULT '',
  metadata jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS knowledge_documents_workspace_active_idx
  ON public.knowledge_documents (workspace_id, is_active, created_at DESC);

CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL DEFAULT 0,
  content text NOT NULL,
  embedding jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS knowledge_chunks_document_idx
  ON public.knowledge_chunks (document_id, chunk_index);

CREATE TABLE IF NOT EXISTS public.content_feature_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  platform text,
  topic text,
  hook_type text,
  cta_type text,
  tone text,
  sentiment text,
  format text,
  pillar text,
  media_type text,
  caption_length integer,
  hashtag_count integer DEFAULT 0,
  source text DEFAULT 'unknown',
  features jsonb DEFAULT '{}'::jsonb,
  model_run_id uuid REFERENCES public.ai_model_runs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_feature_snapshots_post_idx
  ON public.content_feature_snapshots (workspace_id, post_id, platform, created_at DESC);

CREATE TABLE IF NOT EXISTS public.platform_metric_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  platform_post_id text,
  social_account_id uuid REFERENCES public.social_accounts(id) ON DELETE SET NULL,
  platform text NOT NULL,
  views integer DEFAULT 0,
  reach integer DEFAULT 0,
  impressions integer DEFAULT 0,
  likes integer DEFAULT 0,
  comments integer DEFAULT 0,
  saves integer DEFAULT 0,
  shares integer DEFAULT 0,
  clicks integer DEFAULT 0,
  watch_time_seconds integer DEFAULT 0,
  follower_delta integer DEFAULT 0,
  raw jsonb DEFAULT '{}'::jsonb,
  synced_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_metric_snapshots_post_idx
  ON public.platform_metric_snapshots (workspace_id, post_id, platform, synced_at DESC);

CREATE TABLE IF NOT EXISTS public.post_outcome_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  platform text NOT NULL,
  score numeric DEFAULT 0,
  baseline_score numeric DEFAULT 0,
  first_hour_score numeric,
  day_score numeric,
  seven_day_score numeric,
  confidence numeric DEFAULT 0,
  reason_summary text,
  metrics jsonb DEFAULT '{}'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, platform)
);

CREATE INDEX IF NOT EXISTS post_outcome_summaries_workspace_score_idx
  ON public.post_outcome_summaries (workspace_id, platform, score DESC);

CREATE TABLE IF NOT EXISTS public.approval_learning_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  approval_action_id uuid,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  signal_type text NOT NULL,
  comment text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS approval_learning_signals_workspace_idx
  ON public.approval_learning_signals (workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.agent_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  agent_type text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  priority integer DEFAULT 5,
  entity_type text,
  entity_id text,
  input_hash text,
  input_payload jsonb DEFAULT '{}'::jsonb,
  output_payload jsonb DEFAULT '{}'::jsonb,
  error_message text,
  retry_count integer DEFAULT 0,
  scheduled_for timestamptz DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  model_run_id uuid REFERENCES public.ai_model_runs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_tasks_due_idx
  ON public.agent_tasks (status, scheduled_for, priority);

CREATE INDEX IF NOT EXISTS agent_tasks_workspace_created_idx
  ON public.agent_tasks (workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.agent_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.agent_tasks(id) ON DELETE SET NULL,
  artifact_type text NOT NULL,
  title text NOT NULL,
  summary text,
  payload jsonb DEFAULT '{}'::jsonb,
  confidence numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  source_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_artifacts_workspace_type_idx
  ON public.agent_artifacts (workspace_id, artifact_type, status, created_at DESC);

ALTER TABLE public.strategy_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_model_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_brand_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_feature_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_metric_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_outcome_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_learning_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_artifacts ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'strategy_recommendations',
    'strategy_cache',
    'learning_events',
    'ai_model_runs',
    'workspace_brand_profiles',
    'knowledge_documents',
    'knowledge_chunks',
    'content_feature_snapshots',
    'platform_metric_snapshots',
    'post_outcome_summaries',
    'approval_learning_signals',
    'agent_tasks',
    'agent_artifacts'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Workspace members can read ' || table_name, table_name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))',
      'Workspace members can read ' || table_name,
      table_name
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Workspace members can manage brand profiles" ON public.workspace_brand_profiles;
CREATE POLICY "Workspace members can manage brand profiles"
  ON public.workspace_brand_profiles FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'manager', 'creator')
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'manager', 'creator')
    )
  );
