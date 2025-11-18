-- Add 'views' column to post_analytics table (v24.0 metric)
-- Migration for Meta Graph API v24.0 compatibility
-- Date: 2025-11-04

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'post_analytics'
  ) THEN
    ALTER TABLE public.post_analytics
      ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;

    UPDATE public.post_analytics
    SET views = impressions
    WHERE views = 0 AND impressions > 0;

    CREATE INDEX IF NOT EXISTS idx_post_analytics_views
      ON public.post_analytics(views DESC);
  ELSE
    RAISE NOTICE 'Table public.post_analytics does not exist; skipping views column migration.';
  END IF;
END $$;

-- Update RLS policies (no changes needed, just verify)
-- Existing policies already cover the new column

-- Verification query (optional - for manual testing)
-- SELECT COUNT(*) as total_rows, 
--        COUNT(CASE WHEN views > 0 THEN 1 END) as rows_with_views,
--        COUNT(CASE WHEN impressions > 0 THEN 1 END) as rows_with_impressions
-- FROM post_analytics;

