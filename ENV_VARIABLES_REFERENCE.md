# Environment Variables Reference for Vercel Deployment

This document lists all environment variables needed for the Xocial platform, specifically for Facebook integration testing.

## How to Add Environment Variables to Vercel

1. Go to https://vercel.com/dashboard
2. Select your project: **web**
3. Navigate to **Settings > Environment Variables**
4. For each variable below, click **Add New**
5. Enter the **Name** and **Value**
6. Select **Production** environment
7. Click **Save**
8. After adding all variables, go to **Deployments** and click **Redeploy**

## Required Environment Variables for Facebook Testing

### App Configuration

```
NEXT_PUBLIC_APP_URL
Value: https://www.xocial.world
Description: Your deployed application URL
```

### Supabase Configuration

Get these from: https://app.supabase.com/project/_/settings/api

```
NEXT_PUBLIC_SUPABASE_URL
Value: https://your-project-id.supabase.co
Description: Your Supabase project URL
```

```
NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGc...your-anon-key
Description: Supabase anonymous/public key
```

```
SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGc...your-service-role-key
Description: Supabase service role key (keep secret!)
```

### OpenAI Configuration

Get from: https://platform.openai.com/api-keys

```
OPENAI_API_KEY
Value: sk-...your-openai-key
Description: OpenAI API key for AI features
```

### Security & Encryption

Generate with: `openssl rand -hex 32`

```
ENCRYPTION_KEY
Value: (64-character hex string)
Description: Key for encrypting sensitive data like access tokens
Example: a1b2c3d4e5f6...64 characters total
```

```
CRON_SECRET
Value: (64-character hex string)
Description: Secret for authenticating cron job requests
Example: f6e5d4c3b2a1...64 characters total
```

### Facebook / Meta Configuration

Get from: https://developers.facebook.com/apps > Your App > Settings > Basic

```
FACEBOOK_APP_ID
Value: 1234567890123456
Description: Your Meta/Facebook App ID
```

```
FACEBOOK_APP_SECRET
Value: a1b2c3d4e5f6...
Description: Your Meta/Facebook App Secret (keep secret!)
```

Generate secure random tokens with: `openssl rand -hex 32`

```
FACEBOOK_WEBHOOK_VERIFY_TOKEN
Value: (random string you generate)
Description: Token for verifying Facebook webhook requests
Note: You'll use this same value in Meta Dashboard webhook configuration
```

```
INSTAGRAM_WEBHOOK_VERIFY_TOKEN
Value: (different random string you generate)
Description: Token for verifying Instagram webhook requests
Note: You'll use this same value in Meta Dashboard webhook configuration
```

## Optional Environment Variables

These are not required for Facebook testing but may be needed for full functionality:

### Instagram (uses Facebook credentials)
```
INSTAGRAM_CLIENT_ID=<same as FACEBOOK_APP_ID>
INSTAGRAM_CLIENT_SECRET=<same as FACEBOOK_APP_SECRET>
```

### Twitter/X
```
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret
TWITTER_BEARER_TOKEN=your-twitter-bearer-token
TWITTER_WEBHOOK_VERIFY_TOKEN=your-twitter-webhook-token
```

### LinkedIn
```
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
```

### YouTube (Google Cloud Platform)

**Setup Instructions:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable APIs: **YouTube Data API v3** AND **YouTube Analytics API**
4. Create OAuth 2.0 credentials (Web application)
5. Add Authorized Redirect URIs:
   - Production: `https://www.xocial.world/api/oauth/youtube/callback`
   - Development: `http://localhost:3000/api/oauth/youtube/callback`

```
YOUTUBE_CLIENT_ID=your-youtube-client-id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=your-youtube-client-secret
```

**Note:** YouTube requires both APIs enabled for full functionality:
- YouTube Data API v3: Channel info, video upload, statistics
- YouTube Analytics API: Detailed analytics, watch time, subscriber metrics

### TikTok
```
TIKTOK_CLIENT_KEY=your-tiktok-client-key
TIKTOK_CLIENT_SECRET=your-tiktok-client-secret
```

### Monitoring
```
SENTRY_DSN=your-sentry-dsn (optional)
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn (optional)
IP_HASH_SALT=your-ip-salt (optional)
```

## Quick Setup Checklist

- [ ] Add `NEXT_PUBLIC_APP_URL`
- [ ] Add `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Add `OPENAI_API_KEY`
- [ ] Add `ENCRYPTION_KEY` (generate new)
- [ ] Add `CRON_SECRET` (generate new)
- [ ] Add `FACEBOOK_APP_ID` (from Meta Dashboard)
- [ ] Add `FACEBOOK_APP_SECRET` (from Meta Dashboard)
- [ ] Add `FACEBOOK_WEBHOOK_VERIFY_TOKEN` (generate new)
- [ ] Add `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` (generate new)
- [ ] Redeploy application from Vercel Dashboard

## Generating Secure Random Tokens

### On macOS/Linux:
```bash
# Generate 64-character hex string for ENCRYPTION_KEY
openssl rand -hex 32

# Generate webhook verify tokens
openssl rand -hex 32
```

### On Windows (PowerShell):
```powershell
# Generate random token
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | % {[char]$_})
```

### Online Tool:
Visit https://www.random.org/strings/ and generate:
- Length: 64
- Characters: Hex (0-9, a-f)

## Security Best Practices

1. **Never commit secrets to git** - All .env files are in .gitignore
2. **Use different secrets for different environments** - Don't reuse production secrets in development
3. **Rotate secrets regularly** - Especially after team member changes
4. **Limit access** - Only give team members access to secrets they need
5. **Use Vercel's environment variables** - They're encrypted at rest
6. **Monitor usage** - Check Vercel logs for suspicious activity

## Verifying Environment Variables

After adding variables and redeploying, verify they're working:

1. Check deployment logs in Vercel for any environment variable errors
2. Visit your app and check browser console for any missing config errors
3. Try the Facebook OAuth flow - it will fail if credentials are wrong
4. Check Supabase connection by trying to login/register

## Troubleshooting

### "Environment variable not found" error
- Ensure variable is added to **Production** environment in Vercel
- Redeploy after adding variables
- Check spelling matches exactly (case-sensitive)

### "Invalid credentials" error
- Double-check App ID and Secret from Meta Dashboard
- Ensure no extra spaces when copying/pasting
- Verify App is in Development Mode in Meta Dashboard

### Webhook verification fails
- Ensure FACEBOOK_WEBHOOK_VERIFY_TOKEN matches what you entered in Meta Dashboard
- Check that webhook URL is correct and accessible
- Verify application is deployed and running

## Next Steps

After setting up environment variables:

1. Follow the **FACEBOOK_TESTING_GUIDE.md** for step-by-step testing instructions
2. Configure your Meta Developer App with the correct redirect URIs
3. Set up webhooks in Meta Dashboard
4. Test the complete OAuth flow
5. Publish test posts and verify analytics

## Support

If you encounter issues:
- Check Vercel deployment logs
- Review Meta App configuration
- Verify Supabase connection
- Check browser console for client-side errors
- Review application logs in Vercel

