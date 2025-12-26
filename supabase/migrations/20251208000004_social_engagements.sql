-- Social Engagements Table
-- Stores comments, mentions, and other interactions from connected social accounts

CREATE TABLE IF NOT EXISTS social_engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  social_account_id UUID REFERENCES social_accounts(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  external_id TEXT NOT NULL, -- ID from the external platform (comment ID, tweet ID, etc.)
  type TEXT NOT NULL, -- 'comment', 'mention', 'dm', 'follow', 'like'
  
  -- Author info (from external platform)
  author_name TEXT,
  author_handle TEXT,
  author_avatar_url TEXT,
  
  content TEXT,
  
  -- Context
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL, -- Internal post reference if known
  external_post_id TEXT, -- External post ID context
  post_title TEXT,
  
  -- Status
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE,
  is_replied BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure uniqueness of external items per platform/account
  UNIQUE(platform, external_id)
);

-- Enable RLS
ALTER TABLE social_engagements ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Workspace members can view engagements
CREATE POLICY "Workspace members can view engagements"
ON social_engagements FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- Workspace members can update engagements (e.g. mark as read)
CREATE POLICY "Workspace members can update engagements"
ON social_engagements FOR UPDATE
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_social_engagements_workspace ON social_engagements(workspace_id);
CREATE INDEX IF NOT EXISTS idx_social_engagements_occurred_at ON social_engagements(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_engagements_type ON social_engagements(type);
CREATE INDEX IF NOT EXISTS idx_social_engagements_status ON social_engagements(is_read, is_replied);

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_social_engagements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS social_engagements_updated_at ON social_engagements;
CREATE TRIGGER social_engagements_updated_at
  BEFORE UPDATE ON social_engagements
  FOR EACH ROW
  EXECUTE FUNCTION update_social_engagements_updated_at();
