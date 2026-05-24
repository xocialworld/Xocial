-- Compatibility columns used by platform sync and scheduled publish workers.
-- These are intentionally additive so existing analytics snapshots remain intact.

ALTER TABLE public.post_analytics
  ADD COLUMN IF NOT EXISTS external_post_id text;

ALTER TABLE public.post_analytics
  ADD COLUMN IF NOT EXISTS views integer DEFAULT 0;

ALTER TABLE public.post_analytics
  ADD COLUMN IF NOT EXISTS retweets integer DEFAULT 0;

ALTER TABLE public.post_analytics
  ADD COLUMN IF NOT EXISTS replies integer DEFAULT 0;

ALTER TABLE public.post_analytics
  ADD COLUMN IF NOT EXISTS quote_count integer DEFAULT 0;

ALTER TABLE public.post_analytics
  ADD COLUMN IF NOT EXISTS followers_gain integer DEFAULT 0;

ALTER TABLE public.post_analytics
  ADD COLUMN IF NOT EXISTS dislikes integer DEFAULT 0;

ALTER TABLE public.post_analytics
  ADD COLUMN IF NOT EXISTS recorded_at timestamptz DEFAULT now();

ALTER TABLE public.post_analytics
  ADD COLUMN IF NOT EXISTS synced_at timestamptz;

ALTER TABLE public.post_analytics
  ADD COLUMN IF NOT EXISTS metrics_history jsonb DEFAULT '{}'::jsonb;

UPDATE public.post_analytics
SET recorded_at = COALESCE(recorded_at, fetched_at, created_at, now())
WHERE recorded_at IS NULL;

CREATE INDEX IF NOT EXISTS post_analytics_external_post_id_idx
  ON public.post_analytics (external_post_id)
  WHERE external_post_id IS NOT NULL;
