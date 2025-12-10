-- Analytics Materialized Views
-- Phase 5: Performance optimized analytics

-- Check if post_metrics table exists before creating views
DO $$
BEGIN
  -- Create post_metrics table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'post_metrics') THEN
    CREATE TABLE post_metrics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
      social_account_id UUID REFERENCES social_accounts(id) ON DELETE CASCADE,
      workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
      platform TEXT NOT NULL,
      impressions INTEGER DEFAULT 0,
      reach INTEGER DEFAULT 0,
      engagements INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      shares INTEGER DEFAULT 0,
      saves INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      video_views INTEGER DEFAULT 0,
      engagement_rate DECIMAL(5,4) DEFAULT 0,
      recorded_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE post_metrics ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Post metrics viewable by workspace members"
    ON post_metrics FOR SELECT
    USING (
      workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Create indexes for post_metrics
CREATE INDEX IF NOT EXISTS idx_post_metrics_workspace ON post_metrics(workspace_id);
CREATE INDEX IF NOT EXISTS idx_post_metrics_platform ON post_metrics(platform);
CREATE INDEX IF NOT EXISTS idx_post_metrics_recorded ON post_metrics(recorded_at);

-- Daily metrics summary materialized view
DROP MATERIALIZED VIEW IF EXISTS daily_metrics_summary;

CREATE MATERIALIZED VIEW daily_metrics_summary AS
SELECT 
  workspace_id,
  platform,
  DATE_TRUNC('day', recorded_at) AS date,
  COUNT(DISTINCT post_id) AS posts_count,
  SUM(impressions) AS total_impressions,
  SUM(reach) AS total_reach,
  SUM(engagements) AS total_engagements,
  SUM(likes) AS total_likes,
  SUM(comments) AS total_comments,
  SUM(shares) AS total_shares,
  SUM(saves) AS total_saves,
  SUM(clicks) AS total_clicks,
  SUM(video_views) AS total_video_views,
  AVG(engagement_rate) AS avg_engagement_rate
FROM post_metrics
GROUP BY workspace_id, platform, DATE_TRUNC('day', recorded_at);

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_metrics_unique 
ON daily_metrics_summary (workspace_id, platform, date);

-- Weekly metrics summary
DROP MATERIALIZED VIEW IF EXISTS weekly_metrics_summary;

CREATE MATERIALIZED VIEW weekly_metrics_summary AS
SELECT 
  workspace_id,
  platform,
  DATE_TRUNC('week', recorded_at) AS week_start,
  COUNT(DISTINCT post_id) AS posts_count,
  SUM(impressions) AS total_impressions,
  SUM(reach) AS total_reach,
  SUM(engagements) AS total_engagements,
  SUM(likes) AS total_likes,
  SUM(comments) AS total_comments,
  SUM(shares) AS total_shares,
  AVG(engagement_rate) AS avg_engagement_rate
FROM post_metrics
GROUP BY workspace_id, platform, DATE_TRUNC('week', recorded_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_metrics_unique 
ON weekly_metrics_summary (workspace_id, platform, week_start);

-- Top performing posts view
DROP MATERIALIZED VIEW IF EXISTS top_posts_summary;

CREATE MATERIALIZED VIEW top_posts_summary AS
SELECT DISTINCT ON (pm.workspace_id, pm.platform, DATE_TRUNC('month', pm.recorded_at))
  pm.workspace_id,
  pm.platform,
  pm.post_id,
  DATE_TRUNC('month', pm.recorded_at) AS month,
  pm.engagements,
  pm.impressions,
  pm.engagement_rate,
  p.content
FROM post_metrics pm
LEFT JOIN posts p ON p.id = pm.post_id
WHERE pm.recorded_at >= NOW() - INTERVAL '90 days'
ORDER BY pm.workspace_id, pm.platform, DATE_TRUNC('month', pm.recorded_at), pm.engagements DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_top_posts_unique 
ON top_posts_summary (workspace_id, platform, month, post_id);

-- AI Insights storage table
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('daily_summary', 'weekly_summary', 'post_analysis', 'recommendation')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "AI insights viewable by workspace members"
ON ai_insights FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_workspace ON ai_insights(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_type ON ai_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_ai_insights_generated ON ai_insights(generated_at DESC);

-- Function to refresh all analytics views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_metrics_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY weekly_metrics_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY top_posts_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION refresh_analytics_views() TO service_role;
