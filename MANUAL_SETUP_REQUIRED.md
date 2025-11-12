# 🚀 YouTube Integration - Manual Setup Required

## ✅ What's Been Completed

All code changes are complete and pushed to branch `feat/youtube-full-integration`:

### Code Changes
- ✅ Added `yt-analytics.readonly` OAuth scope
- ✅ Implemented on-demand token refresh logic
- ✅ Configured Vercel cron schedules
- ✅ Created comprehensive documentation
- ✅ Added smoke tests for integration validation

### Branch Status
- **Branch:** `feat/youtube-full-integration`
- **Status:** Pushed to GitHub
- **PR:** Manual creation required (repository may be private)
- **Review:** Ready for review and merge

## 🔴 Action Required: Manual Configuration

The following steps require manual intervention as they involve external services:

### 1️⃣ Google Cloud Platform Setup (15 minutes)

**You need to:**

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
   - Sign in with Google account that will manage the project

2. **Create or Select Project**
   - Click project dropdown at top
   - Create new project: "Xocial YouTube Integration"
   - Or select existing project

3. **Enable YouTube Data API v3**
   - Navigate to: **APIs & Services > Library**
   - Search: "YouTube Data API v3"
   - Click **Enable**

4. **Enable YouTube Analytics API**
   - Still in **APIs & Services > Library**
   - Search: "YouTube Analytics API"
   - Click **Enable**

5. **Create OAuth 2.0 Credentials**
   - Go to: **APIs & Services > Credentials**
   - Click: **Create Credentials > OAuth client ID**
   - If prompted, configure OAuth consent screen first:
     - User Type: External (or Internal if workspace)
     - App name: "Xocial"
     - Support email: your email
     - Scopes: Add the YouTube scopes (will be requested during OAuth)
   - Application type: **Web application**
   - Name: "Xocial YouTube Integration"
   
6. **Add Authorized Redirect URIs**
   - Click **Add URI** and add:
     ```
     https://www.xocial.world/api/oauth/youtube/callback
     ```
   - Click **Add URI** again and add:
     ```
     http://localhost:3000/api/oauth/youtube/callback
     ```
   
7. **Copy Credentials**
   - Click **Create**
   - Copy the **Client ID** (looks like: `xxx.apps.googleusercontent.com`)
   - Copy the **Client secret**
   - Save these somewhere secure - you'll need them next

### 2️⃣ Vercel Environment Variables (5 minutes)

**You need to:**

1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**
   - Select team: **Xocial's projects**
   - Find and select your project

2. **Navigate to Environment Variables**
   - Click: **Settings > Environment Variables**

3. **Add/Update These Variables for Production:**

   ```bash
   # If not already set:
   NEXT_PUBLIC_APP_URL=https://www.xocial.world
   
   # Add these (from GCP step above):
   YOUTUBE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   YOUTUBE_CLIENT_SECRET=your-client-secret-from-gcp
   ```

4. **Verify Existing Variables Are Set:**
   - ✅ `NEXT_PUBLIC_SUPABASE_URL`
   - ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - ✅ `SUPABASE_SERVICE_ROLE_KEY`
   - ✅ `OPENAI_API_KEY`
   - ✅ `ENCRYPTION_KEY`
   - ✅ `CRON_SECRET`

### 3️⃣ Deploy to Production (2 minutes)

**You need to:**

1. **Merge the Branch**
   - Go to GitHub repository
   - Create PR from `feat/youtube-full-integration` to `main`
   - Review changes
   - Merge PR

2. **Verify Deployment**
   - Vercel will auto-deploy
   - Wait for deployment to complete
   - Check deployment logs for any errors

3. **Verify Cron Jobs Are Scheduled**
   - In Vercel project: **Settings > Cron Jobs**
   - Confirm these are listed:
     - `/api/cron/publish` (every minute)
     - `/api/cron/sync-metrics` (every 15 minutes)
     - `/api/cron/refresh-youtube-tokens` (hourly) ← NEW
     - `/api/cron/sync-youtube-analytics` (every 4 hours) ← NEW

### 4️⃣ Local Development Setup (5 minutes)

**You need to:**

1. **Create `.env.local` File**
   - In project root
   - Add these variables:
   
   ```bash
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   YOUTUBE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   YOUTUBE_CLIENT_SECRET=your-client-secret-from-gcp
   
   # Copy from Vercel or Supabase:
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-key
   OPENAI_API_KEY=sk-xxx
   ENCRYPTION_KEY=your-64-char-hex
   CRON_SECRET=your-cron-secret
   ```

2. **Start Development Server**
   ```bash
   npm install
   npm run dev
   ```

3. **Test OAuth Flow**
   - Open: `http://localhost:3000/x/connect`
   - Click "Connect YouTube"
   - Complete Google OAuth
   - Verify channel appears

## 🧪 Testing After Setup

### Production Testing
1. Go to: `https://www.xocial.world/x/connect`
2. Click "Connect YouTube"
3. Authorize with Google
4. Verify channel appears in dashboard
5. Try uploading a video
6. Check analytics data appears

### Monitor Cron Jobs
1. Vercel Dashboard > Your Project > Logs
2. Filter by: `/api/cron/refresh-youtube-tokens`
3. Verify it runs successfully every hour
4. Filter by: `/api/cron/sync-youtube-analytics`
5. Verify it runs successfully every 4 hours

## 📊 What Happens Next

Once you complete the manual steps above:

1. **OAuth Flow**: Users can connect YouTube channels
2. **Video Publishing**: Upload videos directly or schedule them
3. **Analytics**: View real-time YouTube metrics in dashboard
4. **Token Management**: Automatic refresh prevents token expiry
5. **Data Sync**: Analytics update every 4 hours automatically

## 🆘 Need Help?

Refer to these documents:
- **Full Guide:** [YOUTUBE_DEPLOYMENT_GUIDE.md](./YOUTUBE_DEPLOYMENT_GUIDE.md)
- **Environment Variables:** [ENV_VARIABLES_REFERENCE.md](./ENV_VARIABLES_REFERENCE.md)
- **System Requirements:** [Xocial SRS.md](./Xocial%20SRS.md)

## ⏱️ Estimated Time

- **GCP Setup:** 15 minutes
- **Vercel Config:** 5 minutes  
- **Deploy:** 2 minutes
- **Local Setup:** 5 minutes
- **Testing:** 10 minutes

**Total:** ~37 minutes to complete full YouTube integration

---

**Status:** Awaiting manual GCP and Vercel configuration.  
**Next Step:** Complete Section 1 (Google Cloud Platform Setup) above.

