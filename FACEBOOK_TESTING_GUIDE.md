# Facebook Integration Testing Guide - Meta Graph API v24.0

## Current Implementation Status

This guide provides step-by-step instructions for testing the Facebook integration that has been implemented in the Xocial platform using Meta Graph API v24.0.

## Prerequisites Checklist

Before you begin testing, ensure you have:

- [ ] Meta Developer App created at https://developers.facebook.com/apps
- [ ] App ID and App Secret from your Meta App
- [ ] At least one Facebook Page that you manage
- [ ] Your Facebook account added as Admin/Tester in the Meta App
- [ ] Access to Vercel Dashboard for environment variables
- [ ] Access to Supabase Dashboard for database verification

## Phase 1: Meta Developer App Configuration

### Step 1.1: Configure App Permissions

1. Go to https://developers.facebook.com/apps
2. Select your app or create a new one
3. In the left sidebar, go to **App Settings > Basic**
4. Configure:
   - **App Type**: Business
   - **Category**: Social Media Management
   - **Privacy Policy URL**: Your privacy policy URL
   - **Terms of Service URL**: Your terms URL

### Step 1.2: Add Required Permissions

1. In left sidebar, go to **App Review > Permissions and Features**
2. Request the following permissions and switch each to **Advanced Access**:
   - `email` - Basic user email
   - `pages_show_list` - List Pages the user manages
   - `pages_read_engagement` - Read Page engagement data
   - `pages_manage_posts` - Create and manage Page posts
   - `pages_read_user_content` - Read user-generated content
   - `pages_manage_engagement` - Manage comments, likes, etc.
   - `instagram_basic` - Basic Instagram account info
   - `instagram_content_publish` - Publish Instagram content
   - `instagram_manage_comments` - Manage Instagram comments
   - `instagram_manage_insights` - Access Instagram insights

> ⚠️ Meta will block page/Instagram data unless these permissions are set to Advanced Access. While waiting for approval, add real users as **App Testers** so they can exercise the integration in Development Mode.

### Step 1.3: Add OAuth Redirect URIs

1. In **App Settings > Basic**
2. Scroll to **App Domains** and add:
   - `www.xocial.world`
   - `xocial.world`
3. Scroll to **Valid OAuth Redirect URIs** and add:
   ```
   https://www.xocial.world/api/oauth/facebook/callback
   https://www.xocial.world/api/oauth/instagram/callback
   ```
4. Click **Save Changes**

### Step 1.4: Configure Webhooks

#### For Facebook Pages:

1. In left sidebar, go to **Products** and add **Webhooks** if not already added
2. Click **Configure** next to Webhooks
3. Under **Page**, click **Add Subscription**
4. Configure:
   - **Callback URL**: `https://www.xocial.world/api/webhooks/facebook`
   - **Verify Token**: Generate a secure random string (e.g., use `openssl rand -hex 32`)
   - Save this token - you'll need it for environment variables
5. Click **Verify and Save**
6. Subscribe to these fields:
   - `feed` - New posts
   - `comments` - New comments  
   - `reactions` - New reactions
   - `page_posts` - Page post updates

#### For Instagram:

1. Under **Instagram** in Webhooks
2. Click **Add Subscription**
3. Configure:
   - **Callback URL**: `https://www.xocial.world/api/webhooks/instagram`
   - **Verify Token**: Generate another secure random string
   - Save this token separately
4. Subscribe to:
   - `comments` - New comments
   - `mentions` - New mentions

### Step 1.5: Add Test Users

1. In left sidebar, go to **Roles > Test Users** or **Roles > Roles**
2. Add your Facebook account as an **Admin** or **Tester**
3. This allows you to test without App Review approval

### Step 1.6: Note Your Credentials

From **App Settings > Basic**, copy:
- **App ID**: (e.g., 1234567890123456)
- **App Secret**: Click **Show** to reveal, then copy

## Phase 2: Vercel Environment Variables Setup

### Step 2.1: Add Environment Variables

1. Go to https://vercel.com/dashboard
2. Select your project: **web**
3. Go to **Settings > Environment Variables**
4. Add the following variables for **Production** environment:

```
NEXT_PUBLIC_APP_URL=https://www.xocial.world
FACEBOOK_APP_ID=<your-app-id-from-meta>
FACEBOOK_APP_SECRET=<your-app-secret-from-meta>
FACEBOOK_WEBHOOK_VERIFY_TOKEN=<your-facebook-webhook-verify-token>
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=<your-instagram-webhook-verify-token>
```

### Step 2.2: Verify Existing Variables

Ensure these are already set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `ENCRYPTION_KEY`
- `CRON_SECRET`

### Step 2.3: Redeploy Application

After adding environment variables:

**Option 1: Via Vercel Dashboard**
1. Go to **Deployments** tab
2. Click on the latest deployment
3. Click **Redeploy** button

**Option 2: Via CLI**
```bash
cd /Users/mitashikamaggu/Desktop/bhanu\ xocial/Xocial\(Latest\)
vercel --prod
```

Wait for deployment to complete and note the deployment URL.

## Phase 3: Database Verification

### Step 3.1: Verify Supabase Tables

1. Go to your Supabase Dashboard
2. Navigate to **Table Editor**
3. Verify these tables exist:
   - `social_accounts` - Stores connected accounts
   - `posts` - Stores post drafts and scheduled posts
   - `platform_posts` - Stores published post IDs
   - `post_analytics` - Stores engagement metrics
   - `engagement_history` - Stores historical data
   - `webhook_events` - Stores webhook events

### Step 3.2: Apply Migration

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the migration SQL from `supabase/migrations/20251104000000_add_views_column.sql`
4. Paste and run the query
5. Verify the `views` column was added to `post_analytics`

## Phase 4: Facebook OAuth Authentication Testing

### Step 4.1: Register/Login to Your App

1. Open: https://web-1hitosft4-xocials-projects.vercel.app
2. Click **Sign Up** or **Login**
3. Create a new account or login with existing credentials
4. Verify you're redirected to the dashboard

### Step 4.2: Connect Facebook Account

1. In the dashboard, navigate to **Settings** or **Connected Accounts**
2. Look for **Connect Facebook** button
3. Click **Connect Facebook**

**Expected Flow:**
- Browser redirects to `/api/oauth/connect?platform=facebook`
- Then redirects to Facebook OAuth dialog
- Shows list of requested permissions
- Click **Continue** to authorize

### Step 4.3: Authorize and Callback

1. On Facebook OAuth screen, review permissions
2. Click **Continue** or **Allow**
3. You'll be redirected back to your app
4. Should see success message: "Facebook pages connected successfully"

**What Happens Behind the Scenes:**
- App receives authorization code
- Exchanges code for short-lived access token
- Exchanges for long-lived token (60 days)
- Fetches your Facebook profile
- Fetches all Facebook Pages you manage
- Stores each Page as a separate account in database

### Step 4.4: Verify Connected Accounts

**In Your App:**
- Go to Connected Accounts page
- Should see all your Facebook Pages listed
- Each should show as "Active" or "Connected"

**In Supabase Dashboard:**
1. Go to **Table Editor > social_accounts**
2. Look for entries with:
   - `platform: 'facebook'`
   - `account_name`: Your Page name
   - `is_active: true`
   - `token_expires_at`: ~60 days in future

## Phase 5: Test Post Publishing

### Step 5.1: Publish a Text Post

1. In your app, go to **Compose** or **Create Post**
2. Enter post content: "Testing Facebook integration with Meta Graph API v24.0 🚀"
3. Select your connected Facebook Page
4. Choose **Publish Now**
5. Click **Publish** button

**Verification:**
- Check your Facebook Page - post should appear
- In Supabase, check `platform_posts` table for new entry
- Check `posts` table - status should be `published`

### Step 5.2: Publish a Photo Post

1. Go to Compose page
2. Click **Add Media** or upload button
3. Upload an image
4. Enter caption: "Testing photo post with v24.0 API"
5. Select Facebook Page
6. Click **Publish**

**Verification:**
- Photo should appear on your Facebook Page
- Image should display correctly

### Step 5.3: Schedule a Post

1. Create a new post
2. Instead of **Publish Now**, select **Schedule**
3. Choose a date/time 1 hour in the future
4. Click **Schedule**

**Verification:**
- In Supabase `posts` table, verify:
  - `status: 'scheduled'`
  - `scheduled_at`: Your chosen timestamp

**To Manually Trigger Scheduled Posts (Free Tier):**
```bash
curl -X POST https://web-1hitosft4-xocials-projects.vercel.app/api/cron/publish \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Phase 6: Test Analytics

### Step 6.1: Wait for Data

After publishing a post, wait **1-2 hours** for Facebook to aggregate analytics data.

### Step 6.2: Fetch Post Insights

**Manual Trigger via API:**
```bash
curl -X POST https://web-1hitosft4-xocials-projects.vercel.app/api/sync/engagement \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"postId": "your-post-id"}'
```

**Or in Your App:**
1. Go to **Analytics** or **Posts** page
2. Click on a published post
3. Click **Sync Metrics** or **Refresh Analytics**

**Verification:**
- In Supabase `post_analytics` table, check for:
  - `impressions` - How many times post was seen
  - `views` - Same as impressions in v24.0
  - `reach` - Unique users who saw post
  - `engagement` - Total interactions
  - `likes`, `comments`, `shares`, `clicks`

### Step 6.3: View Analytics Dashboard

1. In your app, go to **Analytics** page
2. Should see metrics for your posts:
   - Total impressions
   - Engagement rate
   - Best performing posts
   - Charts and graphs

## Phase 7: Test Comment Management

### Step 7.1: Create Test Comments

1. Go to your Facebook Page
2. Find the post you published
3. Add a comment: "Test comment for integration"

### Step 7.2: Fetch Comments in App

1. In your app, go to the post
2. Click **View Comments** or **Comments** tab
3. Should see the comment you just made

### Step 7.3: Reply to Comment

1. Click **Reply** on the comment
2. Enter reply: "Thanks for your comment!"
3. Click **Send** or **Reply**

**Verification:**
- Reply should appear on Facebook Page
- Reply should show in app UI

## Phase 8: Test Webhooks

### Step 8.1: Verify Webhook Setup

Webhooks should have been verified when you configured them in Meta Dashboard. If not:

1. Go to Meta Dashboard > Webhooks
2. Click **Test** button
3. Should see successful verification

### Step 8.2: Test Real-Time Comment Event

1. Go to your Facebook Page
2. Add a new comment on a post
3. Wait 5-10 seconds

**Verification:**
- In Supabase, check `webhook_events` table
- Should see new entry with event type `comments`
- Comment should appear in app without manual refresh

## Phase 9: Test Token Refresh

### Step 9.1: Check Token Expiry

1. In Supabase, go to `social_accounts` table
2. Find your Facebook account
3. Check `token_expires_at` - should be ~60 days from connection

### Step 9.2: Manual Token Refresh Test

```bash
curl -X POST https://web-1hitosft4-xocials-projects.vercel.app/api/cron/refresh-tokens \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Verification:**
- Check `social_accounts` table
- `token_expires_at` should be updated
- Account should remain active

## Phase 10: Instagram Business QA

### Step 10.1: Connect Instagram Business Account
1. From the **Accounts** dashboard, click **Add Account**.
2. Choose **Instagram** and complete the Meta consent flow (ensure the Facebook Page link step is accepted).
3. After redirect, confirm the Instagram card shows the handle, follower count, and linked Facebook Page badge.

**Verification:**
- Supabase `social_accounts` table has a new row with `platform = 'instagram'`.
- `metadata.facebook_page_id` and `account_handle` fields are populated.
- Dashboard card shows `Linked Facebook Page` caption.

### Step 10.2: Publish/Schedule via API
1. Grab the Instagram account ID from the Accounts API (`/api/accounts?platform=instagram`).
2. Issue a POST request to `/api/instagram/publish`:
   ```bash
   curl -X POST https://www.xocial.world/api/instagram/publish \
     -H "Authorization: Bearer YOUR_USER_SESSION" \
     -H "Content-Type: application/json" \
     -d '{
       "accountId": "<social-account-id>",
       "caption": "Testing Instagram API v24.0",
       "mediaUrl": "https://picsum.photos/800",
       "publishAt": null
     }'
   ```
3. Optional: repeat with a future `publishAt` timestamp to validate scheduling.

**Verification:**
- Response includes `postId` (Instagram media ID).
- Instagram feed shows the new photo/video.
- Vercel logs display `[Instagram Callback] Instagram account found` followed by publish success message.

### Step 10.3: Fetch Insights
1. Call `/api/instagram/insights?accountId=<social-account-id>&period=days_28`.
2. Confirm the response returns `metrics` with keys such as `impressions`, `reach`, `profile_views`, `saved`.
3. Visit the Analytics dashboard and verify the **Instagram Insights** panel renders the same metrics.

### Step 10.4: Comment Moderation
1. On Instagram, comment on the newly published post from a secondary profile.
2. Call `/api/instagram/comments?accountId=<social-account-id>&mediaId=<postId>`.
3. Reply using `POST /api/instagram/comments` with `{ "accountId": "...", "commentId": "...", "message": "Thanks!" }`.

**Verification:**
- Comment and reply appear on Instagram.
- Supabase `comments` table contains a row with `platform = 'instagram'`.
- Webhook log shows a processed comment event.

### Step 10.5: Token Refresh Consistency
1. Trigger the cron endpoint `/api/cron/refresh-tokens` as in Phase 9.
2. Ensure the Instagram account row's `token_expires_at` is updated alongside the linked Facebook Page.
3. Re-run `/api/instagram/insights` to confirm the access token remains valid.

## Troubleshooting

### Issue: OAuth Redirect Not Working

**Solution:**
- Verify redirect URI exactly matches in Meta App settings
- Check that `NEXT_PUBLIC_APP_URL` is correct in Vercel
- Ensure no trailing slashes in URLs

### Issue: "Invalid OAuth access token"

**Solution:**
- Token may have expired
- Reconnect Facebook account
- Check that App is in Development Mode or permissions are approved

### Issue: Posts Not Publishing

**Solution:**
- Check `pages_manage_posts` permission is granted
- Verify Page access token is valid
- Check Supabase logs for error messages
- Ensure Page ID is correct

### Issue: Analytics Not Showing

**Solution:**
- Wait 1-2 hours after publishing for Facebook to aggregate data
- Verify `pages_read_engagement` permission is granted
- Check that post was published successfully (has platform_post_id)

### Issue: Webhooks Not Receiving Events

**Solution:**
- Verify webhook is subscribed in Meta Dashboard
- Check verify token matches in environment variables
- Ensure webhook URL is accessible (test with curl)
- Check application logs for webhook errors

## Testing Checklist

Use this checklist to track your testing progress:

- [ ] Meta App configured with all permissions
- [ ] OAuth redirect URIs added
- [ ] Webhooks configured and verified
- [ ] Environment variables added to Vercel
- [ ] Application redeployed
- [ ] Database migration applied
- [ ] User registration/login works
- [ ] Facebook OAuth flow completes
- [ ] Facebook Pages appear in connected accounts
- [ ] Text post publishes successfully
- [ ] Photo post publishes successfully
- [ ] Post scheduling works
- [ ] Post insights fetch correctly
- [ ] Comments fetch and display
- [ ] Comment replies work
- [ ] Webhooks receive events
- [ ] Token refresh works
- [ ] Instagram account connects and displays metadata
- [ ] Instagram publish endpoint returns media ID
- [ ] Instagram insights panel shows metrics
- [ ] Instagram comment API fetches and replies
- [ ] Instagram webhook processes comment events
- [ ] Complete end-to-end flow successful

## Support and Resources

- **Meta Graph API Documentation**: https://developers.facebook.com/docs/graph-api/reference/v24.0
- **Supabase Dashboard**: Your Supabase project URL
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Application Logs**: Check Vercel deployment logs for errors

## Next Steps After Testing

Once all tests pass:

1. **Submit for App Review** (if going to production with non-admin users)
2. **Set up monitoring** for API errors and rate limits
3. **Configure automated cron jobs** (requires Vercel Pro)
4. **Add more Facebook Pages** for testing multi-account scenarios
5. **Test Instagram integration** using the same Meta App

---

**Note**: This is a testing guide. The actual implementation code has already been deployed. This document helps you verify that everything works correctly with real Facebook accounts and data.

