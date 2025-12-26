-- Migrate content_approval_instances to reference content_items instead of posts
-- This aligns the approval system with the planner model (content_items + content_variants)

-- Step 1: Drop existing RLS policies that reference the old FK path
DROP POLICY IF EXISTS "Instances viewable by workspace members" ON content_approval_instances;
DROP POLICY IF EXISTS "Instances createable by creators" ON content_approval_instances;
DROP POLICY IF EXISTS "Actions viewable by workspace members" ON content_approval_actions;
DROP POLICY IF EXISTS "Actions insertable by workspace members" ON content_approval_actions;

-- Step 2: Drop the existing FK constraint (it references posts)
-- We need to handle both possible column names: content_item_id or post_id
DO $$
DECLARE
  fk_name TEXT;
BEGIN
  -- Find and drop FK constraint on content_item_id
  SELECT conname INTO fk_name
  FROM pg_constraint
  WHERE conrelid = 'content_approval_instances'::regclass
    AND contype = 'f'
    AND (
      EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'content_approval_instances' 
        AND column_name = 'content_item_id'
      )
    );
  
  IF fk_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE content_approval_instances DROP CONSTRAINT IF EXISTS ' || quote_ident(fk_name);
  END IF;
END $$;

-- Step 3: Ensure the column is named content_item_id (rename from post_id if needed)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'content_approval_instances'
      AND column_name = 'post_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'content_approval_instances'
      AND column_name = 'content_item_id'
  ) THEN
    ALTER TABLE content_approval_instances RENAME COLUMN post_id TO content_item_id;
  END IF;
END $$;

-- Step 4: Add the new FK constraint to reference content_items
-- First, we need to handle existing data - set content_item_id to NULL for rows that don't have matching content_items
-- (These would be orphaned approval instances from the old posts-based system)
DELETE FROM content_approval_instances
WHERE content_item_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM content_items WHERE content_items.id = content_approval_instances.content_item_id
  );

-- Now add the FK constraint
ALTER TABLE content_approval_instances
DROP CONSTRAINT IF EXISTS content_approval_instances_content_item_id_fkey;

ALTER TABLE content_approval_instances
ADD CONSTRAINT content_approval_instances_content_item_id_fkey
FOREIGN KEY (content_item_id) REFERENCES content_items(id) ON DELETE CASCADE;

-- Step 5: Create new RLS policies that join through content_items.workspace_id

-- Policy: Workspace members can view approval instances
CREATE POLICY "Instances viewable by workspace members"
  ON content_approval_instances FOR SELECT
  USING (
    content_item_id IN (
      SELECT ci.id FROM content_items ci
      WHERE ci.workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Workspace members can create approval instances
CREATE POLICY "Instances createable by creators"
  ON content_approval_instances FOR INSERT
  WITH CHECK (
    content_item_id IN (
      SELECT ci.id FROM content_items ci
      WHERE ci.workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Workspace members can update approval instances (for status changes)
CREATE POLICY "Instances updateable by workspace members"
  ON content_approval_instances FOR UPDATE
  USING (
    content_item_id IN (
      SELECT ci.id FROM content_items ci
      WHERE ci.workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

-- Step 6: Recreate RLS policies for content_approval_actions

-- Policy: Workspace members can view approval actions
CREATE POLICY "Actions viewable by workspace members"
  ON content_approval_actions FOR SELECT
  USING (
    approval_instance_id IN (
      SELECT cai.id FROM content_approval_instances cai
      JOIN content_items ci ON ci.id = cai.content_item_id
      WHERE ci.workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Workspace members can insert approval actions
CREATE POLICY "Actions insertable by workspace members"
  ON content_approval_actions FOR INSERT
  WITH CHECK (
    approval_instance_id IN (
      SELECT cai.id FROM content_approval_instances cai
      JOIN content_items ci ON ci.id = cai.content_item_id
      WHERE ci.workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

-- Step 7: Add index for faster approval lookups
CREATE INDEX IF NOT EXISTS idx_content_approval_instances_content_item 
  ON content_approval_instances(content_item_id);

