# YouTube Integration Testing Guide

Complete guide for testing YouTube integration in Xocial platform.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Google Cloud Console Setup](#google-cloud-console-setup)
3. [Environment Variables](#environment-variables)
4. [Testing OAuth Connection](#testing-oauth-connection)
5. [Testing Video Upload](#testing-video-upload)
6. [Testing Analytics Dashboard](#testing-analytics-dashboard)
7. [Testing Video Scheduling](#testing-video-scheduling)
8. [Testing Metrics Sync](#testing-metrics-sync)
9. [Common Issues & Solutions](#common-issues--solutions)
10. [API Quota Management](#api-quota-management)

---

## Prerequisites

Before testing, ensure you have:

- ✅ A Google account with a YouTube channel
- ✅ Access to Google Cloud Console
- ✅ YouTube channel with some existing videos (recommended for testing analytics)
- ✅ A test video file (MP4 format, < 256 MB for testing)
- ✅ Xocial application deployed or running locally

---

## Google Cloud Console Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Enter project name: `Xocial-YouTube`
4. Click **Create**

### Step 2: Enable YouTube Data API v3

1. In your project, go to **APIs & Services** → **Library**
2. Search for "YouTube Data API v3"
3. Click on it and click **Enable**

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type
3. Click **Create**

**App Information:**
- **App name:** Xocial
- **User support email:** your-email@example.com
- **App logo:** (Optional) Upload your logo

**Developer contact information:**
- **Email addresses:** your-email@example.com

4. Click **Save and Continue**

**Scopes:**
5. Click **Add or Remove Scopes**
6. Add these scopes:
   - `https://www.googleapis.com/auth/youtube` - Manage your YouTube account
   - `https://www.googleapis.com/auth/youtube.upload` - Upload videos
   - `https://www.googleapis.com/auth/youtube.readonly` - View your YouTube account
   - `https://www.googleapis.com/auth/userinfo.profile` - View your profile
   - `https://www.googleapis.com/auth/userinfo.email` - View your email

7. Click **Update** then **Save and Continue**

**Test Users (Development Mode):**
8. Add test users who can test the integration:
   - Click **Add Users**
   - Enter email addresses of test users
   - Click **Add**
9. Click **Save and Continue**

### Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Choose **Web application**

**Configure:**
- **Name:** Xocial Web Client
- **Authorized JavaScript origins:**
  ```
  http://localhost:3000
  https://www.xocial.world
  ```
- **Authorized redirect URIs:**
  ```
  http://localhost:3000/api/oauth/youtube/callback
  https://www.xocial.world/api/oauth/youtube/callback
  ```

4. Click **Create**
5. Copy the **Client ID** and **Client Secret** (you'll need these)

### Step 5: Request Production Approval (When Ready)

For production use, you need to verify your app:

1. Go to **OAuth consent screen**
2. Click **Publish App**
3. Click **Prepare for Verification**
4. Complete the verification process (may take several days)

> **Note:** While in "Testing" mode, only added test users can connect. For production, you must complete verification.

---

## Environment Variables

Add these to your `.env.local` file or Vercel environment variables:

```env
# YouTube / Google OAuth
YOUTUBE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=your-client-secret-here

# Required for OAuth redirects
NEXT_PUBLIC_APP_URL=https://www.xocial.world
# OR for local testing:
# NEXT_PUBLIC_APP_URL=http://localhost:3000

# Enable YouTube in the UI
NEXT_PUBLIC_YOUTUBE_ENABLED=true
```

### Vercel Deployment

If deploying to Vercel:

1. Go to your project in Vercel Dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable above
4. Select **Production** environment
5. Click **Save**
6. **Redeploy** your application

---

## Testing OAuth Connection

### Test 1: Connect YouTube Channel

1. **Login to Xocial**
   - Navigate to your deployed app
   - Sign in with your Xocial account

2. **Navigate to Accounts Page**
   - Click on **Accounts** in the sidebar (or go to `/x`)
   - Click **Add Account** or **Connect Account**

3. **Select YouTube**
   - Find the YouTube card
   - Click **Connect**

4. **Google OAuth Flow**
   - You'll be redirected to Google
   - Select your Google account
   - Review permissions requested:
     - Manage YouTube account
     - Upload videos
     - View channel information
   - Click **Allow**

5. **Verify Connection**
   - You should be redirected back to Xocial
   - Check for success message
   - Verify your YouTube channel appears in connected accounts
   - Check channel details:
     - Channel name
     - Profile picture
     - Subscriber count
     - Video count

### Expected Results

✅ **Success indicators:**
- Green success message displayed
- YouTube channel card shows in accounts list
- Channel avatar, name, and stats display correctly
- Account status shows as "Active"

❌ **If failed, check:**
- Browser console for errors
- Vercel logs for server errors
- Verify environment variables are set
- Ensure redirect URI matches Google Console exactly
- Check if user is added as test user (if app in testing mode)

---

## Testing Video Upload

### Test 2: Upload a Video

#### Prepare Test Video

Create or use a short test video:
- Format: MP4
- Duration: 10-30 seconds recommended
- Size: < 256 MB
- Resolution: 720p or 1080p

#### Upload Process

1. **Navigate to Compose**
   - Go to `/compose` or click **Compose** in sidebar

2. **Select YouTube**
   - In platform selector, click on **YouTube**
   - Verify your channel appears

3. **Add Video Content**
   - **Video File:** Upload your test video
   - **Title:** "Test Video - Xocial Upload"
   - **Description:** "Testing video upload via Xocial social media management platform"
   - **Tags:** (Optional) "test", "xocial"
   - **Category:** Select "Science & Technology" or "People & Blogs"
   - **Privacy:** Select "Unlisted" for testing

4. **Publish**
   - Click **Publish Now** button
   - Wait for upload to complete (may take 1-2 minutes)

5. **Verify Upload**
   - Check for success message
   - Note the video URL provided
   - Open the URL in a new tab
   - Verify video appears on YouTube

#### Direct API Test

You can also test the publish endpoint directly:

```bash
curl -X POST https://www.xocial.world/api/posts/publish/youtube \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "postId": "post-uuid",
    "accountId": "account-uuid",
    "title": "Test Video Title",
    "description": "Test description",
    "videoUrl": "https://url-to-video-file.mp4",
    "privacyStatus": "unlisted",
    "tags": ["test", "xocial"]
  }'
```

### Expected Results

✅ **Success indicators:**
- Upload progress shows
- Success message after completion
- Video URL returned
- Video visible on YouTube
- Video appears in YouTube Studio
- Metadata (title, description, tags) correctly set

❌ **Common issues:**
- **Upload timeout:** Video too large, compress it
- **Quota exceeded:** See [API Quota Management](#api-quota-management)
- **Invalid video format:** Use MP4 with H.264 codec
- **Permission denied:** Re-authenticate your account

---

## Testing Analytics Dashboard

### Test 3: View YouTube Analytics

1. **Navigate to Analytics**
   - Go to `/a` or click **Analytics** in sidebar

2. **YouTube Analytics Section**
   - Scroll to "YouTube Analytics" section
   - You should see card(s) for each connected channel

3. **Verify Channel Stats**
   - **Subscribers:** Should match YouTube Studio
   - **Total Views:** Should match your channel views
   - **Video Count:** Should match number of videos

4. **Check Recent Performance**
   - Views, Likes, Comments for recent videos
   - Should show data for last uploaded videos

5. **Review Recent Videos**
   - Should display last 3-5 videos
   - Each video shows:
     - Thumbnail
     - Title
     - View count
     - Like count
     - Upload date

6. **Refresh Data**
   - Click refresh icon on card
   - Data should update

### Direct API Test

```bash
# Get analytics for specific account
curl https://www.xocial.world/api/analytics/youtube?accountId=ACCOUNT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Expected Results

✅ **Success indicators:**
- Channel statistics display accurately
- Recent videos show with correct thumbnails
- Metrics match YouTube Studio data
- Refresh button works
- Links to YouTube open correctly

---

## Testing Video Scheduling

### Test 4: Schedule a Video

1. **Navigate to Compose**
   - Go to `/compose`

2. **Create Scheduled Post**
   - Select **YouTube** platform
   - Upload video file
   - Add title and description
   - **Important:** Set privacy to "Private"
   - Click **Schedule** tab
   - Select future date/time (e.g., 1 hour from now)

3. **Submit Scheduled Post**
   - Click **Schedule Post**
   - Verify confirmation message

4. **Check Scheduled Posts**
   - Go to **Posts** page
   - Look for your scheduled post
   - Status should show "Scheduled"
   - Date/time should display correctly

5. **Verify on YouTube**
   - Go to YouTube Studio
   - Check "Content" tab
   - Your video should be there as "Private" or "Scheduled"

### Expected Results

✅ **Success indicators:**
- Post status shows as "Scheduled"
- Correct date/time displayed
- Video uploaded to YouTube as Private
- Can edit/cancel scheduled post before publish time

> **Note:** YouTube scheduling happens by uploading as private first, then changing to public at the scheduled time. This requires the cron job to be running.

---

## Testing Metrics Sync

### Test 5: Sync Video Metrics

The metrics sync cron job runs automatically every hour, but you can test it manually.

#### Manual Trigger (Development)

```bash
# Trigger cron job manually
curl https://www.xocial.world/api/cron/sync-youtube-metrics \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

#### Verify Sync

1. **Check Database**
   - Look at `post_analytics` table
   - Should have entries for YouTube posts
   - `fetched_at` should be recent

2. **Check Analytics Dashboard**
   - View YouTube analytics
   - Metrics should reflect latest data
   - Compare with YouTube Studio to verify accuracy

### Configure Vercel Cron

In `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-youtube-metrics",
      "schedule": "0 * * * *"
    }
  ]
}
```

This runs every hour.

### Expected Results

✅ **Success indicators:**
- Cron job completes without errors
- Metrics update in database
- Analytics dashboard shows updated data
- Historical data tracks over time

---

## Common Issues & Solutions

### Issue 1: "OAuth Error: access_denied"

**Cause:** User declined permissions or app not in testing mode

**Solution:**
- Ensure user is added as test user in Google Cloud Console
- Or publish app to production (requires verification)
- Try connecting again and click "Allow"

---

### Issue 2: "No YouTube channels found"

**Cause:** Google account doesn't have a YouTube channel

**Solution:**
- Create a YouTube channel for the Google account
- Go to YouTube.com → Click profile → Create Channel
- Try connecting again

---

### Issue 3: "Token expired" or "Invalid credentials"

**Cause:** Access token expired and refresh token not working

**Solution:**
- Disconnect and reconnect the account
- Check that `refresh_token` is being stored
- Verify OAuth scope includes `access_type=offline` and `prompt=consent`

---

### Issue 4: "Quota exceeded"

**Cause:** YouTube API has daily quota limits

**Solution:**
- Wait until quota resets (midnight Pacific Time)
- Request quota increase from Google
- See [API Quota Management](#api-quota-management)

---

### Issue 5: "Upload failed: Video too large"

**Cause:** Video exceeds upload limits or timeout

**Solution:**
- Compress video to smaller size
- Use shorter videos for testing
- Check video format (use MP4 with H.264)
- Ensure stable internet connection

---

### Issue 6: "Redirect URI mismatch"

**Cause:** OAuth redirect URI doesn't match Google Cloud Console

**Solution:**
- Check `.env` variable `NEXT_PUBLIC_APP_URL`
- Ensure it matches exactly in Google Cloud Console
- Don't forget trailing slashes or protocol (https://)
- Redeploy after changing environment variables

---

## API Quota Management

### Understanding YouTube API Quotas

YouTube Data API v3 has quota limits:
- **Default quota:** 10,000 units per day
- **Quota resets:** Daily at midnight Pacific Time

### Operation Costs

Different operations cost different amounts:

| Operation | Cost (units) |
|-----------|-------------|
| Read (list videos, channels) | 1 |
| Upload video | 1600 |
| Update video | 50 |
| Delete video | 50 |
| List comments | 1 |
| Search | 100 |

### Monitoring Quota Usage

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Dashboard**
4. Click on **YouTube Data API v3**
5. View **Quotas** tab

### Best Practices

1. **Cache Data:** Don't fetch the same data repeatedly
2. **Batch Requests:** Combine API calls when possible
3. **Incremental Sync:** Only sync recent/changed videos
4. **Error Handling:** Handle quota exceeded errors gracefully

### Request Quota Increase

If you need more quota:

1. Go to **YouTube Data API v3** in Google Cloud Console
2. Click **Quotas** tab
3. Click on quota you want to increase
4. Click **Edit Quotas**
5. Fill out the form explaining your use case
6. Submit for review

**Approval typically takes 1-2 weeks.**

---

## Testing Checklist

Use this checklist to ensure complete testing:

### OAuth & Connection
- [ ] Can connect YouTube account
- [ ] Channel information displays correctly
- [ ] Can disconnect account
- [ ] Can reconnect after disconnecting
- [ ] Multiple channels can be connected

### Video Upload
- [ ] Can upload video from composer
- [ ] Title and description set correctly
- [ ] Tags apply properly
- [ ] Privacy settings work (Public, Unlisted, Private)
- [ ] Video appears on YouTube after upload
- [ ] Upload progress shows in UI

### Analytics
- [ ] Channel stats display correctly
- [ ] Recent videos show with thumbnails
- [ ] View counts match YouTube Studio
- [ ] Analytics refresh button works
- [ ] Historical data tracks over time
- [ ] Platform comparison includes YouTube

### Scheduling
- [ ] Can schedule video for future date
- [ ] Scheduled posts show in posts list
- [ ] Video publishes at scheduled time
- [ ] Can edit scheduled post
- [ ] Can cancel scheduled post

### Error Handling
- [ ] Quota exceeded error handled gracefully
- [ ] Invalid video format shows clear error
- [ ] Token expiry triggers re-authentication
- [ ] Upload timeout handled properly
- [ ] Network errors show user-friendly message

---

## Next Steps

After successful testing:

1. **Add More Test Users:** In Google Cloud Console OAuth consent screen
2. **Test with Different Video Formats:** MP4, MOV, AVI
3. **Test Large Videos:** Check upload performance
4. **Monitor Quota Usage:** Ensure staying within limits
5. **Prepare for Production:** Submit app for verification
6. **Document Workflows:** Create user guides for team
7. **Set Up Monitoring:** Track upload success rates
8. **Configure Alerts:** Get notified of API errors

---

## Production Checklist

Before going live:

- [ ] Google Cloud app verified and published
- [ ] OAuth consent screen completed
- [ ] Production environment variables set
- [ ] Cron jobs configured in Vercel
- [ ] Error logging and monitoring set up
- [ ] Quota increased if needed
- [ ] User documentation prepared
- [ ] Support process established
- [ ] Backup/recovery tested
- [ ] Load testing completed

---

## Support & Resources

### Documentation
- [YouTube Data API v3](https://developers.google.com/youtube/v3)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [YouTube API Quota](https://developers.google.com/youtube/v3/getting-started#quota)

### Support Channels
- **Google API Support:** Via Google Cloud Console
- **Xocial Team:** Check internal documentation
- **Community:** Stack Overflow with tags `youtube-api` and `google-oauth`

### Useful Tools
- [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
- [YouTube API Explorer](https://developers.google.com/youtube/v3/docs/)
- [Postman Collection](https://www.postman.com/) for API testing

---

## Troubleshooting Decision Tree

```
Upload Failed?
├─ "Quota exceeded"
│  └─ Wait for quota reset or request increase
├─ "Invalid format"
│  └─ Convert to MP4 with H.264 codec
├─ "Token expired"
│  └─ Disconnect and reconnect account
├─ "Timeout"
│  └─ Compress video or check internet connection
└─ Other error
   └─ Check Vercel logs and browser console

OAuth Failed?
├─ "access_denied"
│  └─ Add user to test users in Google Console
├─ "redirect_uri_mismatch"
│  └─ Check NEXT_PUBLIC_APP_URL matches Google Console
├─ "unauthorized_client"
│  └─ Verify Client ID and Secret are correct
└─ Other error
   └─ Review Google Cloud Console configuration

Analytics Not Showing?
├─ No YouTube accounts connected
│  └─ Connect a YouTube account first
├─ No videos uploaded
│  └─ Upload at least one video
├─ Data not syncing
│  └─ Check cron job logs
└─ Other issue
   └─ Refresh page or clear cache
```

---

## Success Metrics

Track these metrics to measure success:

1. **Connection Rate:** % of users successfully connecting YouTube
2. **Upload Success Rate:** % of video uploads completing successfully
3. **Average Upload Time:** Time from start to completion
4. **API Error Rate:** % of API calls that fail
5. **Quota Usage:** Daily quota consumption
6. **User Engagement:** % of users using YouTube features

---

## Changelog

### Version 1.0.0 (Current)
- ✅ OAuth authentication
- ✅ Video upload
- ✅ Analytics dashboard
- ✅ Metrics sync
- ✅ Video scheduling

### Planned Features
- 🔄 Playlist management
- 🔄 Comment management
- 🔄 Community posts
- 🔄 Live streaming
- 🔄 YouTube Shorts

---

**Happy Testing! 🎥**

For questions or issues, contact your development team or refer to internal documentation.

