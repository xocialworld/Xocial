# YouTube Integration - Quick Start Guide

Get YouTube integration up and running in 5 minutes!

---

## ⚡ Quick Setup (5 Minutes)

### Step 1: Create Google Cloud Project (2 min)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: "Xocial-YouTube"
3. Enable **YouTube Data API v3**

### Step 2: Configure OAuth (2 min)

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** → Fill in basic info
3. Add scopes:
   - `https://www.googleapis.com/auth/youtube`
   - `https://www.googleapis.com/auth/youtube.upload`
   - `https://www.googleapis.com/auth/youtube.readonly`
4. Add test users (your email)

### Step 3: Create Credentials (1 min)

1. Go to **Credentials** → **Create OAuth Client ID**
2. Select **Web application**
3. Add redirect URI:
   ```
   https://www.xocial.world/api/oauth/youtube/callback
   ```
4. Copy **Client ID** and **Client Secret**

### Step 4: Set Environment Variables

Add to Vercel or `.env.local`:

```env
YOUTUBE_CLIENT_ID=your-client-id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=your-client-secret
NEXT_PUBLIC_APP_URL=https://www.xocial.world
NEXT_PUBLIC_YOUTUBE_ENABLED=true
```

### Step 5: Test Connection

1. Deploy or restart your app
2. Go to `/x` (Accounts page)
3. Click **Add Account** → **YouTube**
4. Login and grant permissions
5. ✅ Done! Your YouTube channel is connected

---

## 🚀 First Video Upload

1. Go to `/compose` (Compose page)
2. Select **YouTube** platform
3. Upload a short video (< 50MB recommended)
4. Add title: "Test Video"
5. Set privacy: **Unlisted** (for testing)
6. Click **Publish Now**
7. Wait 30-60 seconds
8. Check your YouTube channel!

---

## 📊 View Analytics

1. Go to `/a` (Analytics page)
2. Scroll to **YouTube Analytics** section
3. See your channel stats:
   - Subscribers
   - Total views
   - Recent videos
4. Click **Refresh** to update data

---

## 🎯 What's Working

✅ **OAuth Authentication**
- Connect YouTube channels
- Automatic token refresh
- Multi-channel support

✅ **Video Upload**
- Direct file upload
- Title, description, tags
- Privacy settings
- Scheduling

✅ **Analytics Dashboard**
- Channel statistics
- Video performance
- Real-time metrics
- Historical data

✅ **Automated Sync**
- Hourly metrics update
- Token management
- Error recovery

---

## 🔧 Configuration Options

### Video Upload Settings

```typescript
{
  title: "Video Title",           // Required
  description: "Description",     // Optional
  tags: ["tag1", "tag2"],        // Optional
  categoryId: "22",              // Default: People & Blogs
  privacyStatus: "public"        // public, unlisted, private
}
```

### Privacy Options

- **Public:** Anyone can find and view
- **Unlisted:** Only people with link can view
- **Private:** Only you can view

### Video Categories

Common category IDs:
- `1` - Film & Animation
- `10` - Music
- `15` - Pets & Animals
- `17` - Sports
- `20` - Gaming
- `22` - People & Blogs (default)
- `24` - Entertainment
- `26` - Howto & Style
- `28` - Science & Technology

---

## 📋 Environment Variables

All required variables:

```env
# YouTube OAuth (Required)
YOUTUBE_CLIENT_ID=xxx.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=xxx

# App Configuration (Required)
NEXT_PUBLIC_APP_URL=https://www.xocial.world

# Feature Flags (Optional)
NEXT_PUBLIC_YOUTUBE_ENABLED=true

# Existing Required Variables
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
ENCRYPTION_KEY=xxx
CRON_SECRET=xxx
```

---

## 🐛 Quick Troubleshooting

### "OAuth Error: access_denied"
**Fix:** Add your email as test user in Google Cloud Console

### "No YouTube channels found"
**Fix:** Create a YouTube channel for your Google account at youtube.com

### "Redirect URI mismatch"
**Fix:** Ensure `NEXT_PUBLIC_APP_URL` matches Google Console redirect URI exactly

### "Upload failed: Quota exceeded"
**Fix:** Wait for quota reset (midnight Pacific Time) or request increase

### "Token expired"
**Fix:** Disconnect and reconnect your YouTube account

---

## 📊 API Quota

**Daily limit:** 10,000 units
- 1 video upload = 1,600 units (~6 uploads/day)
- 1 read operation = 1 unit

**Monitor usage:**
Google Cloud Console → YouTube Data API v3 → Quotas

**Need more quota?**
Request increase in Google Cloud Console

---

## 🧪 Testing Checklist

Quick verification:

- [ ] Connect YouTube account works
- [ ] Channel info displays correctly
- [ ] Video upload completes successfully
- [ ] Video appears on YouTube
- [ ] Analytics show channel stats
- [ ] Recent videos display with thumbnails
- [ ] Can schedule video for future
- [ ] Metrics sync automatically

---

## 📱 User Flow

### Connecting Account
```
Accounts → Add Account → YouTube → Login → Grant Permissions → ✅ Connected
```

### Publishing Video
```
Compose → Select YouTube → Upload Video → Add Details → Publish → ✅ Live on YouTube
```

### Viewing Analytics
```
Analytics → YouTube Section → View Stats → Refresh Data → ✅ Updated Metrics
```

---

## 🎓 Next Steps

1. ✅ Complete basic setup (you just did!)
2. 📖 Read [YOUTUBE_TESTING_GUIDE.md](./YOUTUBE_TESTING_GUIDE.md) for comprehensive testing
3. 📚 Review [YOUTUBE_IMPLEMENTATION_SUMMARY.md](./YOUTUBE_IMPLEMENTATION_SUMMARY.md) for technical details
4. 🚀 Test with real content
5. 📈 Monitor usage and performance
6. 🔐 Submit app for Google verification (for production)

---

## 📞 Need Help?

- **Testing Issues:** See [YOUTUBE_TESTING_GUIDE.md](./YOUTUBE_TESTING_GUIDE.md)
- **Configuration:** Check [ENV_VARIABLES_REFERENCE.md](./ENV_VARIABLES_REFERENCE.md)
- **API Errors:** Review Vercel logs
- **Google Console:** Check [console.cloud.google.com](https://console.cloud.google.com)

---

## 🎉 Success!

You're all set! YouTube integration is ready to use.

**What you can do now:**
- Upload videos directly from Xocial
- Schedule video publications
- Track video performance
- Manage multiple YouTube channels
- Get automated analytics updates

**Happy Creating! 🎥**

