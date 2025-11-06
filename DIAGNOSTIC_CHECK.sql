-- DIAGNOSTIC: Check if Facebook accounts were saved and RLS policies work
-- Run this in Supabase SQL Editor to diagnose the issue

-- ============================================================================
-- STEP 1: Check if any social_accounts exist (bypass RLS)
-- ============================================================================
-- This checks if data was actually saved to the database
SELECT 
    'Total social accounts in database:' as check_name,
    COUNT(*) as count
FROM public.social_accounts;

-- ============================================================================
-- STEP 2: Check Facebook accounts specifically (bypass RLS)
-- ============================================================================
SELECT 
    id,
    workspace_id,
    platform,
    account_id,
    account_name,
    is_active,
    connected_at,
    token_expires_at
FROM public.social_accounts
WHERE platform = 'facebook'
ORDER BY connected_at DESC;

-- ============================================================================
-- STEP 3: Check workspaces (bypass RLS)
-- ============================================================================
SELECT 
    id,
    name,
    slug,
    owner_id,
    created_at
FROM public.workspaces
ORDER BY created_at DESC;

-- ============================================================================
-- STEP 4: Test RLS policy - Check what the current user can see
-- ============================================================================
-- This tests if the RLS policies allow you to see your own data
-- Replace 'YOUR_USER_ID' with your actual user ID from auth.users table

-- First, get your user ID:
SELECT 
    id,
    email,
    created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- STEP 5: After getting your user ID, run this to test RLS
-- ============================================================================
-- Replace the UUID below with your actual user ID from STEP 4

-- SET LOCAL auth.uid TO 'YOUR_USER_ID_HERE';

-- Then test what you can see:
-- SELECT * FROM public.social_accounts WHERE is_active = true;

-- ============================================================================
-- STEP 6: Check if RLS is enabled on social_accounts
-- ============================================================================
SELECT 
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'social_accounts';

-- ============================================================================
-- STEP 7: List all current RLS policies on social_accounts
-- ============================================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'social_accounts'
ORDER BY policyname;

