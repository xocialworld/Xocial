# Xocial - Quick Start Guide

## 🚀 Getting Started

Congratulations! Your Xocial platform implementation is complete. Follow these steps to get it running in production.

---

## 📋 PRE-LAUNCH CHECKLIST

### Step 1: Database Setup

Run the required migrations for new features:

```bash
# Create notifications table migration
```

Create file: `supabase/migrations/20251102120000_add_notifications.sql`

```sql
-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read) WHERE read = false;
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (user_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
```

### Step 2: Environment Variables

Generate security keys:

```bash
# Generate ENCRYPTION_KEY (64 hex characters)
openssl rand -hex 32

# Generate CRON_SECRET (32+ characters)
openssl rand -base64 32
```

Update your `.env.local` file:

```bash
# Required - Already have these
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Required - Generate these
ENCRYPTION_KEY=<generated-64-char-hex>
CRON_SECRET=<generated-32+char-secret>

# Required - AI Features
OPENAI_API_KEY=sk-your-api-key

# Required - App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Change for production

# OAuth - Facebook (if using)
FACEBOOK_APP_ID=your-app-id
FACEBOOK_APP_SECRET=your-app-secret
FACEBOOK_WEBHOOK_VERIFY_TOKEN=xocial_webhook_token_2025

# OAuth - Instagram (if using)
INSTAGRAM_CLIENT_ID=your-client-id
INSTAGRAM_CLIENT_SECRET=your-client-secret
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=xocial_instagram_webhook_2025

# OAuth - Twitter/X (if using)
TWITTER_CLIENT_ID=your-client-id
TWITTER_CLIENT_SECRET=your-client-secret
TWITTER_BEARER_TOKEN=your-bearer-token

# OAuth - LinkedIn (if using)
LINKEDIN_CLIENT_ID=your-client-id
LINKEDIN_CLIENT_SECRET=your-client-secret

# OAuth - YouTube (if using)
YOUTUBE_CLIENT_ID=your-client-id
YOUTUBE_CLIENT_SECRET=your-client-secret

# OAuth - TikTok (if using)
TIKTOK_CLIENT_KEY=your-client-key
TIKTOK_CLIENT_SECRET=your-client-secret

# Optional - Monitoring
SENTRY_DSN=your-sentry-dsn  # If using Sentry
```

### Step 3: Install Dependencies & Verify

```bash
# Install all dependencies
npm install

# Verify environment
npm run check-env

# Run type check
npm run type-check

# Run tests
npm test

# Run linter
npm run lint
```

### Step 4: Test Locally

```bash
# Start development server
npm run dev

# Visit http://localhost:3000
# Test critical flows:
# - User registration/login
# - Connect social account
# - Create and schedule a post
# - View analytics
# - Test notifications
```

### Step 5: Test Cron Jobs

```bash
# In another terminal, test publish endpoint
curl -X GET "http://localhost:3000/api/cron/publish" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Test sync metrics endpoint
curl -X GET "http://localhost:3000/api/cron/sync-metrics" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Step 6: Deploy to Vercel

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
# Go to: Project Settings > Environment Variables

# Deploy to production
vercel --prod
```

---

## 🔍 TESTING CHECKLIST

### Authentication
- [ ] User can sign up with email/password
- [ ] User can log in
- [ ] User can log out
- [ ] Session persists across page refreshes
- [ ] Protected routes redirect to login

### Social Accounts
- [ ] User can connect Facebook account
- [ ] User can connect Instagram account
- [ ] User can connect Twitter account
- [ ] User can connect LinkedIn account
- [ ] User can sync account data
- [ ] User can disconnect account

### Content Creation
- [ ] User can create a post
- [ ] User can select multiple platforms
- [ ] User can upload media
- [ ] User can schedule a post
- [ ] AI content generation works
- [ ] AI hashtag generation works
- [ ] Post templates work with variables

### Automated Publishing
- [ ] Scheduled posts publish automatically
- [ ] Posts appear on actual social platforms
- [ ] Failed posts are marked correctly
- [ ] Error messages are helpful

### Analytics
- [ ] Overview metrics display correctly
- [ ] Engagement charts render
- [ ] Platform stats are accurate
- [ ] Real-time metrics update
- [ ] Export to CSV works
- [ ] Export to JSON works

### Team Collaboration
- [ ] Owner can invite members
- [ ] Invitations are sent
- [ ] Members can accept invitations
- [ ] Role permissions work correctly
- [ ] Members can be removed

### Notifications
- [ ] Notifications appear in real-time
- [ ] Mark as read works
- [ ] Bulk actions work
- [ ] Notification templates work

### Campaigns
- [ ] Can create campaigns
- [ ] Can link posts to campaigns
- [ ] Campaign analytics calculate correctly
- [ ] Can edit and delete campaigns

### Strategy
- [ ] AI recommendations generate
- [ ] Best posting times calculate
- [ ] Content ideas are relevant
- [ ] Recommendations save to database

---

## ⚙️ CONFIGURATION GUIDES

### OAuth App Setup

**Facebook/Instagram:**
1. Go to https://developers.facebook.com
2. Create new app
3. Add Facebook Login product
4. Set Valid OAuth Redirect URIs: `https://yourapp.com/api/oauth/facebook`
5. Get App ID and App Secret
6. For Instagram: Enable Instagram Basic Display

**Twitter/X:**
1. Go to https://developer.twitter.com
2. Create new app
3. Enable OAuth 2.0
4. Set Callback URL: `https://yourapp.com/api/oauth/twitter`
5. Get Client ID and Client Secret

**LinkedIn:**
1. Go to https://www.linkedin.com/developers
2. Create new app
3. Add Sign In with LinkedIn product
4. Set Redirect URLs: `https://yourapp.com/api/oauth/linkedin`
5. Get Client ID and Client Secret

**YouTube:**
1. Go to https://console.cloud.google.com
2. Create new project
3. Enable YouTube Data API v3
4. Create OAuth 2.0 credentials
5. Set Redirect URIs: `https://yourapp.com/api/oauth/youtube`

**TikTok:**
1. Go to https://developers.tiktok.com
2. Create new app
3. Add Login Kit
4. Set Redirect URI: `https://yourapp.com/api/oauth/tiktok`
5. Get Client Key and Client Secret

---

## 🐛 TROUBLESHOOTING

### Cron Jobs Not Running
- Verify CRON_SECRET is set correctly
- Check Vercel cron job logs in dashboard
- Ensure cron endpoints are not cached (using `dynamic = 'force-dynamic'`)

### OAuth Failing
- Verify redirect URLs match exactly (including protocol)
- Check that OAuth app is in production mode (not development)
- Verify all required scopes are requested

### Posts Not Publishing
- Check social account tokens are valid
- Verify platform API credentials
- Check Vercel function logs
- Ensure posts have valid content for each platform

### Real-Time Updates Not Working
- Verify Realtime is enabled in Supabase
- Check that tables are added to publication
- Ensure RLS policies allow reading

### Analytics Not Syncing
- Verify platform API credentials
- Check cron job logs
- Ensure post has external_post_id set
- Verify API rate limits not exceeded

---

## 📞 SUPPORT

If you encounter issues:

1. Check logs: Vercel Dashboard > Functions > Logs
2. Check database: Supabase Dashboard > Table Editor
3. Check health endpoint: `https://yourapp.com/api/health`
4. Review error logs in logger output

---

## 🎯 SUCCESS METRICS TO TRACK

Once deployed, monitor these KPIs:

**Technical Performance:**
- Page load time: < 2 seconds ✓
- API response time: < 500ms ✓
- Database query time: < 100ms ✓
- Error rate: < 0.1% (target)
- Uptime: > 99.9% (target)

**User Experience:**
- Time to first post: < 5 minutes (target)
- Post creation time: < 2 minutes (target)
- Platform connection time: < 1 minute (target)

**Business Metrics:**
- User retention (30-day): > 60% (target)
- Posts published per user
- Active social accounts per user
- AI generation usage

---

## 🎓 ADDITIONAL RESOURCES

- **Xocial SRS.md** - Complete technical specification
- **OAUTH_CALLBACK_URLS.md** - OAuth configuration guide
- **IMPLEMENTATION_SUMMARY.md** - Detailed implementation report
- **Next.js 15 Docs** - https://nextjs.org/docs
- **Supabase Docs** - https://supabase.com/docs
- **React Query Docs** - https://tanstack.com/query/latest

---

**🎊 Your Xocial platform is ready for launch!**

Start with `npm run dev` and test all features before deploying to production.

