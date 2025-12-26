-- Drop existing view if it exists (cascade to dropping indexes)
DROP MATERIALIZED VIEW IF EXISTS daily_metrics_summary CASCADE;

-- Create materialized view for daily analytics
CREATE MATERIALIZED VIEW daily_metrics_summary AS
SELECT
  p.workspace_id,
  DATE(p.published_at) as metric_date,
  pa.platform,
  COUNT(p.id) as post_count,
  COALESCE(SUM(pa.impressions), 0) as impressions,
  COALESCE(SUM(pa.reach), 0) as reach,
  COALESCE(SUM(pa.engagement), 0) as engagement,
  COALESCE(SUM(pa.likes), 0) as likes,
  COALESCE(SUM(pa.comments), 0) as comments,
  COALESCE(SUM(pa.shares), 0) as shares,
  COALESCE(SUM(pa.saves), 0) as saves,
  COALESCE(SUM(pa.clicks), 0) as clicks,
  COALESCE(SUM(pa.video_views), 0) as video_views,
  AVG(pa.engagement_rate) as avg_engagement_rate 
FROM posts p
JOIN post_analytics pa ON p.id = pa.post_id
WHERE p.status = 'published'
GROUP BY p.workspace_id, DATE(p.published_at), pa.platform;

-- Create index for fast lookups
CREATE UNIQUE INDEX idx_daily_metrics_summary_unique 
ON daily_metrics_summary(workspace_id, metric_date, platform);

-- Grant access to authenticated users
GRANT SELECT ON daily_metrics_summary TO authenticated;
GRANT SELECT ON daily_metrics_summary TO service_role;

-- Function to refresh metrics
CREATE OR REPLACE FUNCTION refresh_daily_metrics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_metrics_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on refresh function
GRANT EXECUTE ON FUNCTION refresh_daily_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_daily_metrics() TO service_role;
