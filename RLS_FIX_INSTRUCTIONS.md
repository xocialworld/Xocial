# RLS Policy Fix - Critical Update Required

## Problem
Workspace owners couldn't see any of their data (social accounts, posts, media, templates, etc.) because the RLS policies only checked the `workspace_members` table, but owners aren't automatically added to that table.

## Solution
Apply the comprehensive migration that fixes ALL workspace-scoped tables.

## How to Apply the Fix

### Step 1: Apply Migration 1 (if not already applied)
1. Go to **Supabase Dashboard** → Your Project
2. Click **SQL Editor** in the left sidebar
3. Click **"New Query"**
4. Open the file: `supabase/migrations/20251106000001_fix_all_rls_circular_refs.sql`
5. Copy the entire contents and paste into the SQL Editor
6. Click **"Run"** (or press Cmd/Ctrl + Enter)

### Step 2: Apply Migration 2 (THE CRITICAL FIX)
1. In the same SQL Editor, click **"New Query"** again
2. Open the file: `supabase/migrations/20251106000002_fix_social_accounts_rls.sql`
3. Copy the entire contents and paste into the SQL Editor
4. Click **"Run"** (or press Cmd/Ctrl + Enter)

### Step 3: Verify the Fix
1. Go back to your app: https://www.xocial.world/x
2. Refresh the page (Cmd/Ctrl + R)
3. You should now see your connected Facebook pages in the "Connected Accounts" section! 🎉

## What This Migration Fixes

This migration updates RLS policies for the following tables:
- ✅ `social_accounts` - Your connected Facebook/Instagram pages
- ✅ `posts` - All your scheduled and published posts
- ✅ `post_analytics` - Analytics data for your posts
- ✅ `comments` - Comments on your posts
- ✅ `ai_generations` - AI-generated content
- ✅ `strategy_recommendations` - Strategy insights
- ✅ `api_call_logs` - API usage logs
- ✅ `campaigns` - Marketing campaigns
- ✅ `media` - Uploaded images and videos
- ✅ `post_media` - Media attachments for posts
- ✅ `templates` - Content templates

## Technical Details

**Before:** Policies only checked `workspace_members`:
```sql
workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid()
)
```

**After:** Policies check BOTH workspace ownership AND membership:
```sql
workspace_id IN (
    SELECT id FROM public.workspaces 
    WHERE owner_id = auth.uid()
    UNION
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid()
)
```

This allows workspace owners to access their data immediately, while also supporting team members when you add that feature later.

## Troubleshooting

If you still don't see your connected accounts after applying both migrations:

1. **Check if migrations were successful:**
   - In Supabase SQL Editor, you should see "Success. No rows returned" message
   
2. **Clear your browser cache and cookies:**
   - Hard refresh: Cmd/Ctrl + Shift + R
   
3. **Verify the data exists:**
   - In Supabase Dashboard → Table Editor → `social_accounts`
   - You should see your Facebook pages listed there
   
4. **Check the logs:**
   - Go to Supabase Dashboard → Logs → Postgres Logs
   - Look for any RLS-related errors

## Next Steps After Fix

Once your Facebook pages are showing:
1. Test publishing a post to Facebook
2. Check if analytics data is being fetched
3. Connect Instagram Business accounts (same flow)
4. Verify webhook subscriptions are receiving data

---

**Need Help?** Check the Supabase logs or contact support.

