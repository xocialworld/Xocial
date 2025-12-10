-- Content Comments Table
-- Phase 2: Collaboration features

-- 1. Create content_comments table
CREATE TABLE IF NOT EXISTS content_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES content_comments(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id),
  body TEXT NOT NULL,
  visibility TEXT NOT NULL CHECK (visibility IN ('internal', 'external')) DEFAULT 'internal',
  mentions UUID[] DEFAULT '{}',
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE content_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Workspace members can view all comments (internal visibility)
CREATE POLICY "Workspace members can view internal comments"
ON content_comments FOR SELECT
USING (
  visibility = 'internal' AND
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- External users can only view external comments
CREATE POLICY "External users can view external comments"
ON content_comments FOR SELECT
USING (
  visibility = 'external' AND
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- Workspace members can create comments
CREATE POLICY "Workspace members can create comments"
ON content_comments FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- Users can update their own comments (within 5 minutes for undo)
CREATE POLICY "Users can update own comments"
ON content_comments FOR UPDATE
USING (
  author_id = auth.uid() AND
  created_at > NOW() - INTERVAL '5 minutes'
);

-- Users can delete their own comments (within 5 minutes)
CREATE POLICY "Users can delete own comments"
ON content_comments FOR DELETE
USING (
  author_id = auth.uid() AND
  created_at > NOW() - INTERVAL '5 minutes'
);

-- Admins/owners can delete any comment
CREATE POLICY "Admins can delete any comment"
ON content_comments FOR DELETE
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_content_comments_content_item ON content_comments(content_item_id);
CREATE INDEX IF NOT EXISTS idx_content_comments_workspace ON content_comments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_content_comments_author ON content_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_content_comments_parent ON content_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_content_comments_created ON content_comments(created_at DESC);

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_content_comment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS content_comments_updated_at ON content_comments;
CREATE TRIGGER content_comments_updated_at
  BEFORE UPDATE ON content_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_content_comment_updated_at();
