-- Create Approval Workflows Tables

-- 1. Approval Workflows
CREATE TABLE IF NOT EXISTS approval_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('single_step', 'sequential', 'parallel')),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Approval Workflow Steps
CREATE TABLE IF NOT EXISTS approval_workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES approval_workflows(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  required_role TEXT, -- e.g. 'manager', 'admin'
  required_users UUID[], -- explicit approver user IDs
  approval_rule TEXT NOT NULL CHECK (approval_rule IN ('any', 'all')), -- for parallel steps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Content Approval Instances (tracks the state of approval for a post)
CREATE TABLE IF NOT EXISTS content_approval_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES approval_workflows(id) ON DELETE CASCADE,
  current_step_id UUID REFERENCES approval_workflow_steps(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Content Approval Actions (audit log of approvals/rejections)
CREATE TABLE IF NOT EXISTS content_approval_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_instance_id UUID REFERENCES content_approval_instances(id) ON DELETE CASCADE,
  step_id UUID REFERENCES approval_workflow_steps(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id), -- User who performed the action
  action TEXT NOT NULL CHECK (action IN ('approve', 'reject', 'comment')),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Normalize legacy column names if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'content_approval_instances'
      AND column_name = 'post_id'
  ) THEN
    ALTER TABLE public.content_approval_instances RENAME COLUMN post_id TO content_item_id;
  END IF;
END $$;

-- RLS Policies

-- Enable RLS
ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_approval_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_approval_actions ENABLE ROW LEVEL SECURITY;

-- Policies for approval_workflows
CREATE POLICY "Workflows viewable by workspace members" 
ON approval_workflows FOR SELECT 
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Workflows manageable by admins" 
ON approval_workflows FOR ALL 
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- Policies for approval_workflow_steps
CREATE POLICY "Steps viewable by workspace members" 
ON approval_workflow_steps FOR SELECT 
USING (
  workflow_id IN (
    SELECT id FROM approval_workflows WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Steps manageable by admins" 
ON approval_workflow_steps FOR ALL 
USING (
  workflow_id IN (
    SELECT id FROM approval_workflows WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
);

-- Policies for content_approval_instances
DROP POLICY IF EXISTS "Instances viewable by workspace members" ON content_approval_instances;
DROP POLICY IF EXISTS "Instances createable by creators" ON content_approval_instances;

DO $$
DECLARE target_col text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'content_approval_instances'
      AND column_name = 'content_item_id'
  ) THEN
    target_col := 'content_item_id';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'content_approval_instances'
      AND column_name = 'post_id'
  ) THEN
    target_col := 'post_id';
  ELSE
    RAISE NOTICE 'No content reference column found on content_approval_instances';
  END IF;

  IF target_col IS NOT NULL THEN
    EXECUTE 'CREATE POLICY "Instances viewable by workspace members" ON content_approval_instances FOR SELECT USING (' ||
      target_col || ' IN (SELECT id FROM posts WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())))';

    EXECUTE 'CREATE POLICY "Instances createable by creators" ON content_approval_instances FOR INSERT WITH CHECK (' ||
      target_col || ' IN (SELECT id FROM posts WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())))';
  END IF;
END $$;

-- Policies for content_approval_actions
DROP POLICY IF EXISTS "Actions viewable by workspace members" ON content_approval_actions;
DROP POLICY IF EXISTS "Actions insertable by workspace members" ON content_approval_actions;

DO $$
DECLARE target_col text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'content_approval_instances'
      AND column_name = 'content_item_id'
  ) THEN
    target_col := 'content_item_id';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'content_approval_instances'
      AND column_name = 'post_id'
  ) THEN
    target_col := 'post_id';
  ELSE
    RAISE NOTICE 'No content reference column found on content_approval_instances';
  END IF;

  IF target_col IS NOT NULL THEN
    EXECUTE 'CREATE POLICY "Actions viewable by workspace members" ON content_approval_actions FOR SELECT USING (approval_instance_id IN (SELECT id FROM content_approval_instances WHERE ' || target_col || ' IN (SELECT id FROM posts WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()))))';

    EXECUTE 'CREATE POLICY "Actions insertable by workspace members" ON content_approval_actions FOR INSERT WITH CHECK (approval_instance_id IN (SELECT id FROM content_approval_instances WHERE ' || target_col || ' IN (SELECT id FROM posts WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()))))';
  END IF;
END $$;
