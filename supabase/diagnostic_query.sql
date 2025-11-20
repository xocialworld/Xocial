-- Diagnostic Query to Check Auth and Workspace Setup
-- Run this in Supabase SQL Editor to understand the current state

-- 1. Check current user
SELECT 
    'Current User' as check_type,
    auth.uid() as user_id,
    email
FROM auth.users
WHERE id = auth.uid();

-- 2. Check profiles table
SELECT 
    'Profiles' as check_type,
    id,
    email,
    name
FROM profiles
WHERE id = auth.uid();

-- 3. Check workspaces
SELECT 
    'Workspaces' as check_type,
    w.id,
    w.name,
    w.owner_id,
    CASE 
        WHEN w.owner_id = auth.uid() THEN 'YOU ARE OWNER'
        ELSE 'Not owner'
    END as ownership_status
FROM workspaces w
WHERE w.owner_id = auth.uid()
   OR w.id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid());

-- 4. Check workspace members
SELECT 
    'Workspace Members' as check_type,
    wm.workspace_id,
    wm.user_id,
    wm.role,
    w.name as workspace_name
FROM workspace_members wm
JOIN workspaces w ON w.id = wm.workspace_id
WHERE wm.user_id = auth.uid();

-- 5. Check social accounts
SELECT 
    'Social Accounts (Raw - bypassing RLS)' as check_type,
    sa.id,
    sa.workspace_id,
    sa.platform,
    sa.account_name,
    sa.is_active,
    w.name as workspace_name,
    w.owner_id as workspace_owner
FROM social_accounts sa
JOIN workspaces w ON w.id = sa.workspace_id
WHERE w.owner_id = auth.uid() 
   OR sa.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid());

-- 6. Test RLS Policy - What social_accounts can you see through RLS?
SELECT 
    'Social Accounts (via RLS)' as check_type,
    COUNT(*) as count
FROM social_accounts;
