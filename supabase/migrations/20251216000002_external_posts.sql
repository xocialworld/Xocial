-- Create external_posts table for imported platform content
-- This table stores posts fetched from connected social accounts (read-only from user perspective)

CREATE TABLE IF NOT EXISTS external_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  social_account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  external_post_id TEXT NOT NULL, -- Platform's unique ID for this post
  permalink TEXT, -- Direct link to the post on the platform
  
  -- Content
  content JSONB DEFAULT '{}', -- caption, title, description, etc.
  media JSONB DEFAULT '[]', -- Array of media objects
  post_type TEXT, -- e.g., 'post', 'video', 'short', 'reel', 'story', 'tweet'
  
  -- Timestamps
  published_at TIMESTAMPTZ, -- When the post was published on the platform
  fetched_at TIMESTAMPTZ DEFAULT NOW(), -- When we last fetched/updated this record
  
  -- Metrics (optional, for display purposes)
  metrics JSONB DEFAULT '{}', -- likes, comments, shares, views, etc.
  
  -- Raw data for debugging/future use
  raw JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Dedupe constraint: one record per platform post per account
  UNIQUE(social_account_id, platform, external_post_id)
);

-- Indexes for calendar queries
CREATE INDEX IF NOT EXISTS idx_external_posts_workspace_published 
  ON external_posts(workspace_id, published_at);
CREATE INDEX IF NOT EXISTS idx_external_posts_account 
  ON external_posts(social_account_id);
CREATE INDEX IF NOT EXISTS idx_external_posts_platform 
  ON external_posts(platform);

-- Enable RLS
ALTER TABLE external_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Workspace members can view external posts
CREATE POLICY "Workspace members can view external posts"
  ON external_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = external_posts.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

-- Service role can manage all external posts (for sync jobs)
CREATE POLICY "Service role can manage external posts"
  ON external_posts FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger to update updated_at on changes
CREATE OR REPLACE FUNCTION update_external_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_external_posts_updated_at ON external_posts;
CREATE TRIGGER trigger_external_posts_updated_at
  BEFORE UPDATE ON external_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_external_posts_updated_at();

