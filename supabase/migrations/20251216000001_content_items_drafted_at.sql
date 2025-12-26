-- Add drafted_at and approval_workflow_id to content_items
-- drafted_at: explicit date for placing drafts on the calendar (defaults to created_at)
-- approval_workflow_id: optional FK to attach an approval workflow later

-- Add drafted_at column
ALTER TABLE content_items
ADD COLUMN IF NOT EXISTS drafted_at TIMESTAMPTZ;

-- Backfill existing rows: drafted_at = created_at
UPDATE content_items
SET drafted_at = created_at
WHERE drafted_at IS NULL;

-- Set default for future inserts
ALTER TABLE content_items
ALTER COLUMN drafted_at SET DEFAULT NOW();

-- Add approval_workflow_id column (nullable FK)
ALTER TABLE content_items
ADD COLUMN IF NOT EXISTS approval_workflow_id UUID REFERENCES approval_workflows(id) ON DELETE SET NULL;

-- Add index for calendar date queries
CREATE INDEX IF NOT EXISTS idx_content_items_drafted_at ON content_items(drafted_at);
CREATE INDEX IF NOT EXISTS idx_content_items_scheduled_at ON content_items(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_content_items_workspace_status ON content_items(workspace_id, status);

-- Existing RLS policies from 20251203000002 remain valid since they check workspace_members via workspace_id
-- No changes needed to RLS for these new columns

