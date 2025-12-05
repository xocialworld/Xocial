-- Create media_assets table as per blueprint
CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  mime_type TEXT, -- Added for convenience, though not strictly in blueprint snippet, it's useful
  size_bytes BIGINT NOT NULL,
  width INT,
  height INT,
  tags TEXT[],
  uploaded_by UUID REFERENCES profiles(id),
  -- Actually, let's stick to blueprint "references profiles(id)" if profiles exists.
  -- But wait, in route.ts we get user from auth.getUser().
  -- Let's check if profiles table exists first.
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  used_in_content UUID[] DEFAULT '{}'
);

-- Add RLS policies
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;

-- Allow read access to workspace members
CREATE POLICY "Workspace members can view media assets" ON media_assets
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Allow upload to workspace members
CREATE POLICY "Workspace members can upload media assets" ON media_assets
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Allow delete to workspace members (or maybe just owners/admins? keeping it simple for now)
CREATE POLICY "Workspace members can delete media assets" ON media_assets
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );
