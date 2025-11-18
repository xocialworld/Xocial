DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'platform_posts'
      AND column_name = 'social_account_id'
  ) THEN
    ALTER TABLE public.platform_posts
      ADD COLUMN social_account_id UUID REFERENCES public.social_accounts(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN undefined_column THEN
    NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_platform_posts_social_account
  ON public.platform_posts(social_account_id);

WITH metadata_accounts AS (
  SELECT
    pp.id AS platform_post_id,
    p.metadata -> 'accountIds' ->> pp.platform AS account_id_str
  FROM public.platform_posts pp
  JOIN public.posts p ON p.id = pp.post_id
  WHERE pp.social_account_id IS NULL
    AND p.metadata -> 'accountIds' ? pp.platform
),
normalized_accounts AS (
  SELECT
    platform_post_id,
    account_id_str::uuid AS account_uuid
  FROM metadata_accounts
  WHERE account_id_str ~ '^[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}$'
)
UPDATE public.platform_posts AS pp
SET social_account_id = na.account_uuid
FROM normalized_accounts na
WHERE pp.id = na.platform_post_id
  AND pp.social_account_id IS NULL;

CREATE OR REPLACE FUNCTION public.get_workspace_account_metrics(
  workspace_uuid UUID,
  start_date TIMESTAMPTZ DEFAULT (now() - INTERVAL '90 days'),
  end_date   TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  social_account_id UUID,
  platform TEXT,
  posts_published INTEGER,
  total_likes BIGINT,
  total_comments BIGINT,
  total_shares BIGINT,
  total_engagement BIGINT,
  avg_engagement_rate NUMERIC,
  last_published_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  total_video_views BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
WITH account_scope AS (
  SELECT sa.id, sa.platform
  FROM public.social_accounts sa
  WHERE sa.workspace_id = workspace_uuid
),
post_scope AS (
  SELECT
    pp.social_account_id,
    pp.platform,
    pp.published_at
  FROM public.platform_posts pp
  JOIN public.posts p ON p.id = pp.post_id
  WHERE p.workspace_id = workspace_uuid
    AND pp.published_at BETWEEN start_date AND end_date
    AND pp.social_account_id IS NOT NULL
),
post_counts AS (
  SELECT
    ps.social_account_id,
    ps.platform,
    COUNT(*) AS posts_published,
    MAX(ps.published_at) AS last_published_at
  FROM post_scope ps
  GROUP BY ps.social_account_id, ps.platform
),
engagement_scope AS (
  SELECT
    pp.social_account_id,
    pa.platform,
    SUM(COALESCE(pa.likes, 0)) AS total_likes,
    SUM(COALESCE(pa.comments, 0)) AS total_comments,
    SUM(COALESCE(pa.shares, 0)) AS total_shares,
    SUM(
      COALESCE(
        pa.engagement,
        COALESCE(pa.likes, 0) + COALESCE(pa.comments, 0) + COALESCE(pa.shares, 0)
      )
    ) AS total_engagement,
    AVG(NULLIF(pa.engagement_rate, 0)) AS avg_engagement_rate,
    MAX(pa.updated_at) AS last_synced_at,
    SUM(COALESCE(pa.video_views, 0)) AS total_video_views
  FROM public.post_analytics pa
  JOIN public.posts p ON p.id = pa.post_id
  LEFT JOIN public.platform_posts pp
    ON pp.post_id = pa.post_id
   AND pp.platform = pa.platform
  WHERE p.workspace_id = workspace_uuid
    AND pa.updated_at BETWEEN start_date AND end_date
    AND pp.social_account_id IS NOT NULL
  GROUP BY pp.social_account_id, pa.platform
)
SELECT
  sa.id AS social_account_id,
  sa.platform,
  COALESCE(pc.posts_published, 0)::INTEGER AS posts_published,
  COALESCE(es.total_likes, 0)::BIGINT AS total_likes,
  COALESCE(es.total_comments, 0)::BIGINT AS total_comments,
  COALESCE(es.total_shares, 0)::BIGINT AS total_shares,
  COALESCE(es.total_engagement, 0)::BIGINT AS total_engagement,
  COALESCE(es.avg_engagement_rate, 0)::NUMERIC AS avg_engagement_rate,
  pc.last_published_at,
  es.last_synced_at,
  COALESCE(es.total_video_views, 0)::BIGINT AS total_video_views
FROM account_scope sa
LEFT JOIN post_counts pc
  ON pc.social_account_id = sa.id
 AND pc.platform = sa.platform
LEFT JOIN engagement_scope es
  ON es.social_account_id = sa.id
 AND es.platform = sa.platform
ORDER BY sa.platform, sa.id;
$$;

REVOKE ALL ON FUNCTION public.get_workspace_account_metrics(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_workspace_account_metrics(UUID, TIMESTAMPTZ, TIMESTAMPTZ)
  TO authenticated, service_role;

