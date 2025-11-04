-- Add 'views' column to post_analytics table (v24.0 metric)
-- Migration for Meta Graph API v24.0 compatibility
-- Date: 2025-11-04

-- Add views column alongside impressions (keep both for backward compatibility)
ALTER TABLE post_analytics 
ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;

-- Backfill views from impressions for existing data
UPDATE post_analytics 
SET views = impressions 
WHERE views = 0 AND impressions > 0;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_post_analytics_views 
ON post_analytics(views DESC);

-- Update RLS policies (no changes needed, just verify)
-- Existing policies already cover the new column

-- Verification query (optional - for manual testing)
-- SELECT COUNT(*) as total_rows, 
--        COUNT(CASE WHEN views > 0 THEN 1 END) as rows_with_views,
--        COUNT(CASE WHEN impressions > 0 THEN 1 END) as rows_with_impressions
-- FROM post_analytics;

