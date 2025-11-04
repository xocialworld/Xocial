# Free Tier Testing Guide (Without Cron Jobs)

## 🆓 Deploying on Vercel Free Tier

I've removed the cron jobs from `vercel.json` so you can deploy on Vercel's free tier for testing.

---

## 🔄 Manual Alternatives to Cron Jobs

Since cron jobs require Vercel Pro, here are **free alternatives** for testing:

### 1. **Manual Publishing** (Already Works!)

**What it does:** Publish posts immediately or schedule them for later

**How to use:**
- Create a post in the composer
- Click "Publish Now" → Posts immediately
- Click "Schedule" → Saves to database with scheduled time
- **Manually trigger publishing** by visiting: `https://your-app.vercel.app/api/cron/publish`

**Testing:**
```bash
# Trigger scheduled post publishing manually
curl https://your-app.vercel.app/api/cron/publish

# Or visit in browser
open https://your-app.vercel.app/api/cron/publish
```

---

### 2. **Manual Metrics Sync**

**What it does:** Fetch latest engagement metrics from Facebook/Instagram

**How to use:**
- Visit: `https://your-app.vercel.app/api/cron/sync-metrics`
- Or use the "Sync Now" button in analytics dashboard (if implemented)

**Testing:**
```bash
# Manually sync metrics
curl https://your-app.vercel.app/api/cron/sync-metrics
```

---

### 3. **Manual Token Refresh**

**What it does:** Refresh expiring Facebook tokens

**How to use:**
- Visit: `https://your-app.vercel.app/api/cron/refresh-tokens`
- Only needed when tokens are about to expire (every ~50 days)

**Testing:**
```bash
# Manually refresh tokens
curl https://your-app.vercel.app/api/cron/refresh-tokens
```

---

## 🆓 Free External Cron Services (Recommended for Testing)

If you want automated scheduling during testing, use these **free services**:

### **Option 1: Cron-Job.org** (Best for Testing)
- **Free tier:** Unlimited jobs
- **Setup:**
  1. Go to: https://cron-job.org
  2. Create free account
  3. Add these jobs:
     - **Publish Posts:** `https://your-app.vercel.app/api/cron/publish` - Every 1 minute
     - **Sync Metrics:** `https://your-app.vercel.app/api/cron/sync-metrics` - Every 15 minutes
     - **Refresh Tokens:** `https://your-app.vercel.app/api/cron/refresh-tokens` - Daily at 2 AM

### **Option 2: EasyCron**
- **Free tier:** 20 jobs
- **Setup:** https://www.easycron.com/

### **Option 3: cron-job.io**
- **Free tier:** 50 jobs
- **Setup:** https://cron-job.io/

---

## 🔐 Securing Your Cron Endpoints

**Important:** Since these endpoints are now publicly accessible, add authentication:

### Add to your cron endpoints:

```typescript
// Example: src/app/api/cron/publish/route.ts
export async function GET(request: NextRequest) {
  // Add simple token authentication
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.CRON_SECRET;
  
  if (authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // ... rest of your code
}
```

**Then add to Vercel environment variables:**
- `CRON_SECRET` = `your-random-secret-token-here`

**Update external cron service:**
- Add header: `Authorization: Bearer your-random-secret-token-here`

---

## 🎯 Testing Workflow (Free Tier)

### Phase 1: Basic Testing (Manual)
1. ✅ Deploy to Vercel (free)
2. ✅ Connect Facebook account
3. ✅ Create and publish posts manually
4. ✅ Manually trigger metrics sync
5. ✅ Verify everything works

### Phase 2: Automated Testing (Free External Cron)
1. ✅ Sign up for Cron-Job.org (free)
2. ✅ Add your 3 cron jobs
3. ✅ Test automated publishing
4. ✅ Test automated metrics sync
5. ✅ Monitor for a few days

### Phase 3: Production (Upgrade to Vercel Pro)
1. ✅ Once testing is complete
2. ✅ Upgrade to Vercel Pro ($20/month)
3. ✅ Re-enable cron jobs in `vercel.json`
4. ✅ Remove external cron service
5. ✅ Everything runs natively on Vercel

---

## 📊 What Still Works on Free Tier

**All features work perfectly:**
- ✅ OAuth connections (Facebook, Instagram, etc.)
- ✅ Post creation and editing
- ✅ Media uploads
- ✅ Immediate publishing
- ✅ Scheduled posts (saved to database)
- ✅ Analytics dashboard
- ✅ Comment management
- ✅ Demographics insights
- ✅ All API endpoints
- ✅ All UI components

**Only difference:**
- ⏰ Scheduled posts don't auto-publish (need manual trigger or external cron)
- 📊 Metrics don't auto-sync (need manual trigger or external cron)
- 🔄 Tokens don't auto-refresh (need manual trigger or external cron)

---

## 💰 Cost Comparison

### Free Tier (Current)
- **Vercel:** $0/month
- **Cron-Job.org:** $0/month
- **Total:** $0/month ✅

### Vercel Pro (Later)
- **Vercel Pro:** $20/month
- **Total:** $20/month

---

## 🚀 Deploy Now (Free)

Since I've removed the cron jobs, you can now deploy for free:

```bash
cd /Users/mitashikamaggu/Desktop/bhanu\ xocial/Xocial\(Latest\)
vercel --prod
```

**No Pro plan needed!** 🎉

---

## 📝 Re-enabling Cron Jobs Later

When you're ready to upgrade to Vercel Pro, just uncomment the cron jobs in `vercel.json`:

```json
"crons": [
  {
    "path": "/api/cron/publish",
    "schedule": "* * * * *"
  },
  {
    "path": "/api/cron/sync-metrics",
    "schedule": "*/15 * * * *"
  },
  {
    "path": "/api/cron/refresh-tokens",
    "schedule": "0 2 * * *"
  }
]
```

Then redeploy and remove the external cron service.

---

**Happy Testing! 🎉**

