# YouTube Integration - Deployment Guide

This guide helps you complete the YouTube integration deployment for both development and production environments.

## ✅ Code Changes Completed

All code changes have been implemented and committed to branch `feat/youtube-full-integration`:
- ✅ Added `yt-analytics.readonly` OAuth scope
- ✅ Implemented on-demand token refresh in `createYouTubeClient`
- ✅ Added Vercel cron schedules for token refresh and analytics sync
- ✅ Updated environment variable documentation

## 🔧 Manual Configuration Steps

### 1. Google Cloud Platform Setup

**Step 1: Create/Select GCP Project**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project

**Step 2: Enable Required APIs**
1. Navigate to **APIs & Services > Library**
2. Search and enable:
   - ✅ **YouTube Data API v3**
   - ✅ **YouTube Analytics API**

**Step 3: Create OAuth 2.0 Credentials**
1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. Application type: **Web application**
4. Name: `Xocial YouTube Integration`
5. Authorized redirect URIs:
   - Add: `https://www.xocial.world/api/oauth/youtube/callback` (Production)
   - Add: `http://localhost:3000/api/oauth/youtube/callback` (Development)
6. Click **Create**
7. Copy the **Client ID** and **Client Secret**

### 2. Vercel Environment Variables (Production)

**Step 1: Access Vercel Dashboard**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your team: **Xocial's projects**
3. Select your project
4. Navigate to **Settings > Environment Variables**

**Step 2: Set/Verify Environment Variables**

Add or verify these variables for **Production** environment:

```bash
NEXT_PUBLIC_APP_URL=https://www.xocial.world
YOUTUBE_CLIENT_ID=your-client-id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=your-client-secret
```

**Existing variables should already be set:**
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `OPENAI_API_KEY`
- ✅ `ENCRYPTION_KEY`
- ✅ `CRON_SECRET`

**Step 3: Deploy Updated Code**
1. Merge PR `feat/youtube-full-integration` to `main`
2. Vercel will auto-deploy with new `vercel.json` cron schedules
3. Verify deployment succeeds

**Step 4: Verify Cron Jobs**
After deployment, go to **Project Settings > Cron Jobs** and confirm:
- ✅ `/api/cron/publish` - every minute
- ✅ `/api/cron/sync-metrics` - every 15 minutes
- ✅ `/api/cron/refresh-youtube-tokens` - every hour
- ✅ `/api/cron/sync-youtube-analytics` - every 4 hours

### 3. Local Development Setup

**Step 1: Create `.env.local` file**

In your project root, create or update `.env.local`:

```bash
# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase (copy from Vercel or Supabase dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-your-openai-key

# Security
ENCRYPTION_KEY=your-64-char-hex-string
CRON_SECRET=your-cron-secret

# YouTube (from GCP)
YOUTUBE_CLIENT_ID=your-client-id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=your-client-secret

# Other OAuth (if needed)
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
# ... other platform credentials
```

**Step 2: Install Dependencies & Run**

```bash
npm install
npm run dev
```

**Step 3: Test YouTube OAuth**
1. Navigate to `http://localhost:3000/x/connect`
2. Click "Connect YouTube"
3. Complete Google OAuth flow
4. Verify channel appears in dashboard

## 🧪 Testing Checklist

### Development Testing
- [ ] Connect YouTube account via OAuth
- [ ] Upload a test video via compose page
- [ ] View video in dashboard
- [ ] Check analytics for the video
- [ ] Verify token refresh logic (manually expire token in DB and retry API call)

### Production Testing
- [ ] Connect YouTube account via OAuth
- [ ] Publish/schedule a video
- [ ] Verify cron publishes scheduled posts
- [ ] Check analytics dashboard shows YouTube metrics
- [ ] Verify hourly token refresh cron runs successfully
- [ ] Verify 4-hour analytics sync cron runs successfully

## 📊 Monitoring

**Check Cron Job Logs:**
1. Vercel Dashboard > Project > Logs
2. Filter by function: `/api/cron/refresh-youtube-tokens`
3. Filter by function: `/api/cron/sync-youtube-analytics`

**Monitor YouTube API Quota:**
1. GCP Console > APIs & Services > Dashboard
2. Select YouTube Data API v3
3. View quota usage (10,000 units/day default)

**Check Token Expiry:**
Query Supabase `social_accounts` table:
```sql
SELECT 
  account_name, 
  token_expires_at,
  token_expires_at < NOW() as is_expired
FROM social_accounts 
WHERE platform = 'youtube' 
AND is_active = true;
```

## 🚨 Troubleshooting

### Issue: OAuth Error "invalid_redirect_uri"
**Solution:** Verify redirect URI in GCP exactly matches:
- Prod: `https://www.xocial.world/api/oauth/youtube/callback`
- Dev: `http://localhost:3000/api/oauth/youtube/callback`

### Issue: "Access Not Configured" Error
**Solution:** Enable both APIs in GCP:
- YouTube Data API v3
- YouTube Analytics API

### Issue: Token Expired During Upload
**Solution:** The on-demand refresh should handle this automatically. If it fails:
1. Check `refresh_token` exists in `social_accounts` table
2. Verify `YOUTUBE_CLIENT_ID` and `YOUTUBE_CLIENT_SECRET` are correct
3. Re-connect the YouTube account

### Issue: Analytics Not Syncing
**Solution:**
1. Verify YouTube Analytics API is enabled in GCP
2. Check OAuth scope includes `yt-analytics.readonly`
3. Check cron job logs for errors
4. Reconnect YouTube account to get updated scopes

## 🎯 Success Criteria

All features working:
- ✅ YouTube OAuth connection (dev + prod)
- ✅ Video upload/publishing (immediate)
- ✅ Video scheduling (via cron)
- ✅ Channel analytics retrieval
- ✅ Video analytics retrieval
- ✅ Automatic token refresh (hourly cron)
- ✅ Automatic analytics sync (4-hour cron)
- ✅ On-demand token refresh before API calls

## 📚 Related Documentation

- [Xocial SRS](./Xocial%20SRS.md) - Complete system requirements
- [ENV_VARIABLES_REFERENCE.md](./ENV_VARIABLES_REFERENCE.md) - All environment variables
- [YouTube OAuth Docs](https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps)
- [YouTube Data API](https://developers.google.com/youtube/v3)
- [YouTube Analytics API](https://developers.google.com/youtube/analytics)

---

**Status:** Code changes complete. Manual GCP and Vercel configuration required.
**Next Step:** Follow Section 1 (GCP Setup) to generate OAuth credentials.

