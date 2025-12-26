-- Add new columns to workspaces table
ALTER TABLE workspaces 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS color_theme TEXT DEFAULT 'teal';

-- Update workspace_members role check constraint
-- First drop the existing constraint
ALTER TABLE workspace_members 
DROP CONSTRAINT IF EXISTS workspace_members_role_check;

-- Add the new constraint with expanded roles
ALTER TABLE workspace_members 
ADD CONSTRAINT workspace_members_role_check 
CHECK (role IN ('owner', 'admin', 'manager', 'creator', 'analyst', 'guest'));
