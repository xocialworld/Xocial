-- Durable user feedback for Xocial AI recommendations, generations, and workflow suggestions.
-- This keeps explicit user decisions separate from the immutable learning event stream.

CREATE TABLE IF NOT EXISTS public.ai_feedback_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_type text NOT NULL,
  target_id text,
  action text NOT NULL,
  reason_type text,
  comment text,
  original_value jsonb DEFAULT '{}'::jsonb,
  edited_value jsonb DEFAULT '{}'::jsonb,
  apply_to_brand_brain boolean DEFAULT false,
  brand_brain_update jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_feedback_actions_workspace_created_idx
  ON public.ai_feedback_actions (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_feedback_actions_target_idx
  ON public.ai_feedback_actions (workspace_id, target_type, target_id);

ALTER TABLE public.ai_feedback_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members can read ai_feedback_actions" ON public.ai_feedback_actions;
CREATE POLICY "Workspace members can read ai_feedback_actions"
  ON public.ai_feedback_actions FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Workspace members can create ai_feedback_actions" ON public.ai_feedback_actions;
CREATE POLICY "Workspace members can create ai_feedback_actions"
  ON public.ai_feedback_actions FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'manager', 'creator', 'analyst', 'client', 'editor')
    )
  );
