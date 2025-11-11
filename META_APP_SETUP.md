# Meta Developer App Setup Guide

Quick reference for configuring your Meta (Facebook) Developer App for Xocial integration.

## Prerequisites

- Facebook account
- At least one Facebook Page you manage
- Access to Meta Developer Console

## Step-by-Step Setup

### 1. Create or Access Your App

1. Go to https://developers.facebook.com/apps
2. Click **Create App** (or select existing app)
3. Choose **Business** as app type
4. Fill in:
   - **App Name**: Xocial (or your preferred name)
   - **App Contact Email**: Your email
   - **Business Account**: Select or create one

### 2. Basic Settings

Navigate to: **Settings > Basic**

#### App Domains
```
www.xocial.world
xocial.world
```

#### Privacy Policy URL
```
https://www.xocial.world/privacy
```
(The privacy policy page lives in the Next.js app at `src/app/privacy/page.tsx`)

#### Terms of Service URL
```
https://www.xocial.world/terms
```
(Add this page before submitting the app for review.)

#### App Category
```
Social Media Management
```

### 3. Add Products

In left sidebar, click **Add Products** and add:

- **Facebook Login** - For OAuth authentication
- **Webhooks** - For real-time updates

### 4. Configure Facebook Login

Navigate to: **Facebook Login > Settings**

#### Valid OAuth Redirect URIs
Add these two URIs (one per line):
```
https://www.xocial.world/api/oauth/facebook/callback
https://www.xocial.world/api/oauth/instagram/callback
```

#### Client OAuth Settings
- **Client OAuth Login**: Yes
- **Web OAuth Login**: Yes
- **Force Web OAuth Reauthentication**: No
- **Use Strict Mode for Redirect URIs**: Yes
- **Enforce HTTPS**: Yes

### 5. Request Permissions

Navigate to: **App Review > Permissions and Features**

#### Required Permissions (Request these):

**Facebook Permissions:**
- ✅ `email` - Get user's email address
- ✅ `pages_show_list` - List Pages user manages
- ✅ `pages_read_engagement` - Read Page engagement metrics
- ✅ `pages_manage_posts` - Create and manage Page posts
- ✅ `pages_read_user_content` - Read user-generated content on Pages
- ✅ `pages_manage_engagement` - Manage comments, likes, reactions

**Instagram Permissions:**
- ✅ `instagram_basic` - Basic Instagram account info
- ✅ `instagram_content_publish` - Publish Instagram content
- ✅ `instagram_manage_comments` - Manage Instagram comments
- ✅ `instagram_manage_insights` - Access Instagram insights

> ⚠️ **Critical**: These scopes must be switched to **Advanced Access** in the Meta dashboard. Without advanced access, Meta will return empty page/account lists and block publishing.

#### Converting to Advanced Access
1. Navigate to **App Review → Permissions and Features**.
2. Locate each permission listed above and click **Get Advanced Access**.
3. Confirm eligibility criteria (business verification, privacy policy, data handling).
4. Provide required screencasts, the Xocial privacy policy URL, and a detailed use-case description.
5. Submit the request. Meta typically responds in 3–7 business days.

While waiting for review approval, add real users as **App Testers** so they can exercise the integration in Development Mode (steps below).

#### Reviewer Walkthrough Checklist
When submitting for review, attach the following:
- A 2–3 minute video showing: logging into https://www.xocial.world, connecting a Facebook page, confirming the page card appears, composing and scheduling a post, and viewing analytics.
- A second clip covering Instagram: showing the linked Facebook page, connecting the Instagram business account, publishing a test post, and opening the analytics dashboard.
- Test account credentials (Facebook page admin + Instagram business account) added as **Users → Testers** with instructions to accept the invitation.
- A note that webhook callbacks are available at `https://www.xocial.world/api/webhooks/facebook` and `/api/webhooks/instagram` with verify tokens set in Vercel (`FACEBOOK_WEBHOOK_VERIFY_TOKEN`, `INSTAGRAM_WEBHOOK_VERIFY_TOKEN`).

### 6. Configure Webhooks

Navigate to: **Webhooks**

#### Facebook Pages Webhook

1. Click **Add Subscription** under **Page**
2. Configure:
   - **Callback URL**: 
     ```
     https://www.xocial.world/api/webhooks/facebook
     ```
   - **Verify Token**: Generate a random string
     ```bash
     # Generate with:
     openssl rand -hex 32
     ```
     Save this token - you'll need it for `FACEBOOK_WEBHOOK_VERIFY_TOKEN` environment variable
   
3. Click **Verify and Save**
4. Subscribe to these fields:
   - ✅ `feed` - New posts on the Page
   - ✅ `comments` - New comments on Page posts
   - ✅ `reactions` - Reactions on Page posts
   - ✅ `page_posts` - Updates to Page posts

#### Instagram Webhook

1. Click **Add Subscription** under **Instagram**
2. Configure:
   - **Callback URL**: 
     ```
     https://www.xocial.world/api/webhooks/instagram
     ```
   - **Verify Token**: Generate another random string
     ```bash
     openssl rand -hex 32
     ```
     Save this token - you'll need it for `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` environment variable
   
3. Click **Verify and Save**
4. Subscribe to these fields:
   - ✅ `comments` - New comments on Instagram posts
   - ✅ `mentions` - Mentions of your Instagram account

### 7. Add App Roles (Admins, Developers, Testers)

Navigate to: **Roles > Roles**

1. Navigate to **Users → App Testers** (or **App Admins** if you need full control).
2. Click **Add Testers**, enter the Facebook emails of teammates and reviewers.
3. Ask each person to accept the invitation at https://www.facebook.com/settings?tab=business_tools.
4. Repeat for Instagram by visiting the linked Business Manager (Business Settings → Users → People) and assigning the Facebook page with **Full Control** plus the Instagram account.

> Testers bypass App Review in Development Mode, but production users require approved advanced access.

### 8. Get Your Credentials

Navigate to: **Settings > Basic**

#### Copy These Values:
- **App ID**: (e.g., 1234567890123456)
- **App Secret**: Click **Show** button, then copy

You'll need these for:
- `FACEBOOK_APP_ID` environment variable
- `FACEBOOK_APP_SECRET` environment variable

### 9. App Mode

Ensure your app is in **Development Mode**:

Navigate to: **Settings > Basic**

Look for **App Mode** at the top:
- Should show: **Development**
- If it shows **Live**, switch to Development for testing

**Development Mode** allows:
- Testing with admin/developer/tester accounts
- No App Review required
- Full API access for testing

## Configuration Checklist

Use this checklist to verify your setup:

- [ ] App created and basic info filled
- [ ] App domains configured
- [ ] Privacy policy URL added
- [ ] Terms of service URL added
- [ ] Facebook Login product added
- [ ] OAuth redirect URIs configured (both Facebook and Instagram)
- [ ] Required permissions requested
- [ ] Facebook Pages webhook configured
- [ ] Instagram webhook configured
- [ ] Webhook verify tokens generated and saved
- [ ] Your account added as Admin/Tester
- [ ] App ID and App Secret copied
- [ ] App is in Development Mode

## Quick Reference

### URLs to Configure in Meta Dashboard

| Setting | URL |
|---------|-----|
| App Domain | `web-1hitosft4-xocials-projects.vercel.app` |
| Facebook OAuth Redirect | `https://web-1hitosft4-xocials-projects.vercel.app/api/oauth/facebook/callback` |
| Instagram OAuth Redirect | `https://web-1hitosft4-xocials-projects.vercel.app/api/oauth/instagram/callback` |
| Facebook Webhook | `https://web-1hitosft4-xocials-projects.vercel.app/api/webhooks/facebook` |
| Instagram Webhook | `https://web-1hitosft4-xocials-projects.vercel.app/api/webhooks/instagram` |

### Credentials to Save

| Credential | Where to Get | Where to Use |
|------------|--------------|--------------|
| App ID | Settings > Basic | `FACEBOOK_APP_ID` in Vercel |
| App Secret | Settings > Basic (click Show) | `FACEBOOK_APP_SECRET` in Vercel |
| Facebook Webhook Token | You generate it | `FACEBOOK_WEBHOOK_VERIFY_TOKEN` in Vercel |
| Instagram Webhook Token | You generate it | `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` in Vercel |

## Testing Your Configuration

### Test OAuth Redirect
1. In Meta Dashboard, go to **Facebook Login > Settings**
2. Find your redirect URI in the list
3. Should see green checkmark if configured correctly

### Test Webhook
1. In Meta Dashboard, go to **Webhooks**
2. Find your webhook subscription
3. Click **Test** button
4. Should see "Success" message

### Test Permissions
1. Try connecting your Facebook account in your app
2. Should see all requested permissions in the OAuth dialog
3. If permissions are missing, check App Review status

## Common Issues

### "Redirect URI Mismatch" Error
- Ensure redirect URI in Meta Dashboard exactly matches the one in your code
- No trailing slashes
- Use HTTPS (not HTTP)
- Check for typos

### "Invalid App ID" Error
- Verify App ID is correct in environment variables
- No spaces or extra characters
- Check that App is not deleted or suspended

### Webhook Verification Fails
- Ensure verify token in Meta Dashboard matches environment variable
- Check that webhook URL is accessible
- Verify application is deployed and running
- Check application logs for errors

### Permissions Not Showing
- Ensure permissions are requested in App Review section
- Check that App is in Development Mode
- Verify your account is added as Admin/Tester

## Next Steps

After completing this setup:

1. ✅ Add environment variables to Vercel (see `ENV_VARIABLES_REFERENCE.md`)
2. ✅ Redeploy your application
3. ✅ Follow testing guide (see `FACEBOOK_TESTING_GUIDE.md`)
4. ✅ Test OAuth flow
5. ✅ Test post publishing
6. ✅ Test analytics
7. ✅ Test webhooks

## Going to Production

When ready to allow non-admin users:

1. **Submit for App Review**
   - Navigate to **App Review > Permissions and Features**
   - Click **Request** next to each permission
   - Provide detailed use case descriptions
   - Submit screencast showing how you use each permission

2. **Switch to Live Mode**
   - After approval, go to **Settings > Basic**
   - Toggle **App Mode** to **Live**

3. **Monitor Usage**
   - Check **Analytics** for API usage
   - Monitor rate limits
   - Set up error tracking

## Support Resources

- **Meta Developer Documentation**: https://developers.facebook.com/docs
- **Graph API Explorer**: https://developers.facebook.com/tools/explorer
- **Meta Business Help Center**: https://www.facebook.com/business/help
- **Developer Community**: https://developers.facebook.com/community

## Notes

- Keep your App Secret secure - never expose it in client-side code
- Rotate webhook verify tokens periodically
- Monitor your app's API usage to avoid rate limits
- Test thoroughly in Development Mode before going Live
- Keep your app's contact email up to date for important notifications

---

**Last Updated**: November 2024  
**API Version**: Graph API v24.0

