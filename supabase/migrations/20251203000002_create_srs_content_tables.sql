-- Create content_items table
CREATE TABLE IF NOT EXISTS content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT,
  brief TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'in_review', 'approved', 'scheduled', 'published', 'rejected')),
  scheduled_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create content_variants table
CREATE TABLE IF NOT EXISTS content_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
  social_account_id UUID REFERENCES social_accounts(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  caption TEXT,
  media_ids UUID[] , -- references media_library if implemented as array of UUIDs
  hashtags TEXT[],
  mentions TEXT[],
  link_url TEXT,
  platform_specific JSONB DEFAULT '{}', 
  status TEXT NOT NULL CHECK (status IN ('draft', 'ready', 'scheduled', 'published', 'failed')),
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_variants ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies (Basic)
-- Allow workspace members to view items
CREATE POLICY "Workspace members can view content items"
  ON content_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = content_items.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can view content variants"
  ON content_variants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM content_items
      JOIN workspace_members ON workspace_members.workspace_id = content_items.workspace_id
      WHERE content_items.id = content_variants.content_item_id
      AND workspace_members.user_id = auth.uid()
    )
  );

-- Allow workspace members to insert/update
CREATE POLICY "Workspace members can manage content items"
  ON content_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = content_items.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can manage content variants"
  ON content_variants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM content_items
      JOIN workspace_members ON workspace_members.workspace_id = content_items.workspace_id
      WHERE content_items.id = content_variants.content_item_id
      AND workspace_members.user_id = auth.uid()
    )
  );
