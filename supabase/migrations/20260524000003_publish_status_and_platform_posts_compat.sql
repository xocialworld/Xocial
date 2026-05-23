-- Align production publishing tables with the application publish workflow.

ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_status_check;

ALTER TABLE public.posts
  ADD CONSTRAINT posts_status_check
  CHECK (
    status = ANY (
      ARRAY[
        'draft'::text,
        'pending_approval'::text,
        'approved'::text,
        'scheduled'::text,
        'published'::text,
        'failed'::text,
        'partial'::text,
        'rejected'::text
      ]
    )
  );

ALTER TABLE public.platform_posts
  ADD COLUMN IF NOT EXISTS platform_post_id text,
  ADD COLUMN IF NOT EXISTS permalink text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

UPDATE public.platform_posts
SET platform_post_id = external_id
WHERE platform_post_id IS NULL
  AND external_id IS NOT NULL;

UPDATE public.platform_posts
SET external_id = platform_post_id
WHERE external_id IS NULL
  AND platform_post_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS platform_posts_post_platform_external_unique
  ON public.platform_posts (post_id, platform, platform_post_id)
  WHERE platform_post_id IS NOT NULL;
