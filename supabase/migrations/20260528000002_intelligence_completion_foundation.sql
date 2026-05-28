-- Completes the first intelligence hardening pass:
-- event idempotency, Brand Brain version history, and worker/context indexes.

ALTER TABLE public.learning_events
  ADD COLUMN IF NOT EXISTS event_key text;

CREATE UNIQUE INDEX IF NOT EXISTS learning_events_event_key_unique
  ON public.learning_events (workspace_id, event_key)
  WHERE event_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS learning_events_validation_idx
  ON public.learning_events (workspace_id, event_type, source, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.workspace_brand_profile_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  brand_profile_id uuid REFERENCES public.workspace_brand_profiles(id) ON DELETE SET NULL,
  version_no integer NOT NULL DEFAULT 1,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  changed_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  change_source text NOT NULL DEFAULT 'user',
  change_reason text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brand_profile_versions_workspace_created_idx
  ON public.workspace_brand_profile_versions (workspace_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS brand_profile_versions_workspace_no_unique
  ON public.workspace_brand_profile_versions (workspace_id, version_no);

CREATE INDEX IF NOT EXISTS knowledge_chunks_workspace_created_idx
  ON public.knowledge_chunks (workspace_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS knowledge_chunks_document_chunk_unique
  ON public.knowledge_chunks (document_id, chunk_index);

CREATE INDEX IF NOT EXISTS agent_tasks_workspace_status_due_idx
  ON public.agent_tasks (workspace_id, status, scheduled_for, priority);

ALTER TABLE public.workspace_brand_profile_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members can read brand profile versions" ON public.workspace_brand_profile_versions;
CREATE POLICY "Workspace members can read brand profile versions"
  ON public.workspace_brand_profile_versions FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Workspace managers can create brand profile versions" ON public.workspace_brand_profile_versions;
CREATE POLICY "Workspace managers can create brand profile versions"
  ON public.workspace_brand_profile_versions FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'manager', 'creator')
    )
  );
