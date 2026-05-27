CREATE TABLE IF NOT EXISTS public.media_processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_media_asset_id UUID REFERENCES public.media_assets(id) ON DELETE SET NULL,
  output_media_asset_id UUID REFERENCES public.media_assets(id) ON DELETE SET NULL,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  progress INTEGER NOT NULL DEFAULT 0,
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.media_processing_jobs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS media_processing_jobs_workspace_created_idx
  ON public.media_processing_jobs (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS media_processing_jobs_status_idx
  ON public.media_processing_jobs (status)
  WHERE status IN ('queued', 'processing');

DROP POLICY IF EXISTS "Workspace members can view media processing jobs" ON public.media_processing_jobs;
CREATE POLICY "Workspace members can view media processing jobs"
ON public.media_processing_jobs FOR SELECT
USING (
  workspace_id IN (
    SELECT wm.workspace_id
    FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Workspace creators can create media processing jobs" ON public.media_processing_jobs;
CREATE POLICY "Workspace creators can create media processing jobs"
ON public.media_processing_jobs FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT wm.workspace_id
    FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin', 'manager', 'creator', 'editor')
  )
);
