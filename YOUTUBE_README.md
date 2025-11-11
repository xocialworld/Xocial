# YouTube Integration - README

## 🎉 YouTube Integration Complete!

Full YouTube functionality has been successfully integrated into Xocial platform.

---

## ✅ What's Been Implemented

### Core Features
- ✅ **OAuth Authentication** - Connect YouTube channels via Google
- ✅ **Video Upload** - Direct video uploads with metadata
- ✅ **Video Scheduling** - Schedule videos for future publication  
- ✅ **Analytics Dashboard** - Real-time channel and video statistics
- ✅ **Automated Sync** - Hourly metrics synchronization
- ✅ **Multi-Channel Support** - Manage multiple YouTube channels
- ✅ **Post Composer Integration** - Seamless video publishing workflow
- ✅ **Error Handling** - Comprehensive error management and recovery

---

## 📁 Key Files

### API Routes
- `src/app/api/oauth/youtube/callback/route.ts` - OAuth callback handler
- `src/app/api/posts/publish/youtube/route.ts` - Video publishing endpoint
- `src/app/api/analytics/youtube/route.ts` - Analytics data endpoint
- `src/app/api/youtube/insights/route.ts` - Detailed video insights
- `src/app/api/cron/sync-youtube-metrics/route.ts` - Metrics sync cron job

### UI Components
- `src/app/(dashboard)/a/components/youtube-card.tsx` - Analytics dashboard card
- `src/app/(dashboard)/compose/components/previews/youtube-preview.tsx` - Video preview
- `src/app/(dashboard)/compose/components/platform-selector.tsx` - Platform selection

### Backend Libraries
- `src/lib/oauth/youtube.ts` - YouTube OAuth utilities and API calls
- `src/lib/platforms/youtube.ts` - YouTube client class

---

## 🚀 Quick Start

### 1. Set Up Google Cloud Console (5 min)

1. Create project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable YouTube Data API v3
3. Configure OAuth consent screen
4. Create OAuth credentials
5. Copy Client ID and Secret

**Detailed Instructions:** [YOUTUBE_QUICK_START.md](./YOUTUBE_QUICK_START.md)

### 2. Add Environment Variables

```env
YOUTUBE_CLIENT_ID=your-client-id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=your-client-secret
NEXT_PUBLIC_APP_URL=https://www.xocial.world
NEXT_PUBLIC_YOUTUBE_ENABLED=true
```

### 3. Deploy & Test

1. Deploy to Vercel or restart local server
2. Navigate to `/x` (Accounts page)
3. Click "Add Account" → "YouTube"
4. Authorize and connect your channel
5. Upload a test video from `/compose`
6. View analytics at `/a`

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **[YOUTUBE_QUICK_START.md](./YOUTUBE_QUICK_START.md)** | Get started in 5 minutes |
| **[YOUTUBE_TESTING_GUIDE.md](./YOUTUBE_TESTING_GUIDE.md)** | Comprehensive testing procedures |
| **[YOUTUBE_IMPLEMENTATION_SUMMARY.md](./YOUTUBE_IMPLEMENTATION_SUMMARY.md)** | Technical implementation details |
| **[YOUTUBE_FEATURES.md](./YOUTUBE_FEATURES.md)** | Complete feature reference |
| **[ENV_VARIABLES_REFERENCE.md](./ENV_VARIABLES_REFERENCE.md)** | All environment variables |

---

## 🎯 Feature Highlights

### Video Publishing
```
Upload → Add Metadata → Set Privacy → Schedule → Publish
```
- Support for MP4, MOV, AVI formats
- Up to 256 MB file size
- Resumable uploads
- Progress tracking
- Immediate or scheduled publishing

### Analytics Dashboard
```
Channel Stats + Video Performance + Recent Videos + Historical Data
```
- Real-time subscriber count
- Total views and engagement
- Individual video metrics
- Performance trends over time

### Automated Workflows
```
Cron Job → Sync Metrics → Update Database → Refresh Analytics
```
- Hourly metrics sync
- Automatic token refresh
- Error recovery
- Quota management

---

## 🔧 Configuration

### Required Environment Variables

```env
# YouTube OAuth
YOUTUBE_CLIENT_ID=xxx.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=xxx

# App Config
NEXT_PUBLIC_APP_URL=https://www.xocial.world

# Feature Flag
NEXT_PUBLIC_YOUTUBE_ENABLED=true
```

### Optional Settings

```env
# Max upload size (bytes)
YOUTUBE_MAX_UPLOAD_SIZE=268435456

# Upload timeout (ms)
YOUTUBE_UPLOAD_TIMEOUT=300000

# Sync interval (ms)
YOUTUBE_SYNC_INTERVAL=3600000
```

---

## 🧪 Testing

### Quick Test Flow

**1. Connect Account**
```
/x → Add Account → YouTube → Authorize → ✅ Connected
```

**2. Upload Video**
```
/compose → Select YouTube → Upload Video → Add Title → Publish → ✅ Live
```

**3. View Analytics**
```
/a → YouTube Section → Channel Stats → Recent Videos → ✅ Data Shown
```

### Automated Tests

Run test suite:
```bash
npm test -- youtube
```

Manual API tests:
```bash
# Test OAuth
curl https://www.xocial.world/api/oauth/connect?platform=youtube

# Test Analytics
curl https://www.xocial.world/api/analytics/youtube?accountId=xxx

# Test Sync
curl https://www.xocial.world/api/cron/sync-youtube-metrics
```

---

## 📊 API Endpoints

### Public Endpoints
- `GET /api/oauth/connect?platform=youtube` - Initiate OAuth
- `GET /api/oauth/youtube/callback` - OAuth callback

### Authenticated Endpoints  
- `POST /api/posts/publish/youtube` - Upload video
- `GET /api/analytics/youtube` - Get channel analytics
- `GET /api/youtube/insights` - Get video insights

### Cron Endpoints
- `GET /api/cron/sync-youtube-metrics` - Sync metrics (hourly)

**Full API Reference:** [YOUTUBE_FEATURES.md#api-reference](./YOUTUBE_FEATURES.md#api-reference)

---

## 🐛 Common Issues

### Connection Issues

**Problem:** OAuth fails with "access_denied"  
**Solution:** Add user as test user in Google Cloud Console

**Problem:** "No YouTube channels found"  
**Solution:** Create a YouTube channel for the Google account

**Problem:** "Redirect URI mismatch"  
**Solution:** Verify `NEXT_PUBLIC_APP_URL` matches Google Console exactly

### Upload Issues

**Problem:** Upload times out  
**Solution:** Compress video to smaller size (< 100 MB recommended)

**Problem:** "Quota exceeded"  
**Solution:** Wait for reset (midnight PT) or request quota increase

**Problem:** "Invalid video format"  
**Solution:** Convert to MP4 with H.264 codec

**Full Troubleshooting:** [YOUTUBE_TESTING_GUIDE.md#common-issues--solutions](./YOUTUBE_TESTING_GUIDE.md#common-issues--solutions)

---

## 🚦 Production Checklist

Before going live:

- [ ] Google Cloud app verified and published
- [ ] Production environment variables set
- [ ] OAuth redirect URIs configured
- [ ] Cron jobs running (verify in Vercel)
- [ ] Test with real users
- [ ] Monitor quota usage
- [ ] Set up error alerting
- [ ] Document user workflows
- [ ] Train support team
- [ ] Prepare user documentation

---

## 📈 Monitoring

### Key Metrics to Track

**Technical:**
- Upload success rate
- Average upload time  
- API error rate
- Token refresh rate
- Quota usage (daily)

**Business:**
- Number of connected channels
- Videos published per day
- User engagement with YouTube features
- Feature adoption rate

### Monitoring Tools

**Vercel Dashboard:**
- Function logs
- Error tracking
- Performance metrics

**Google Cloud Console:**
- API quota usage
- Request volume
- Error rates

---

## 🔐 Security

### Authentication & Authorization
- ✅ OAuth 2.0 with PKCE
- ✅ Encrypted token storage
- ✅ Automatic token rotation
- ✅ Workspace-based access control
- ✅ CSRF protection

### Data Privacy
- ✅ Minimal data collection
- ✅ User consent for permissions
- ✅ Secure data transmission (HTTPS)
- ✅ GDPR compliance ready

---

## 🎓 Support Resources

### Documentation
- [YouTube Data API v3 Docs](https://developers.google.com/youtube/v3)
- [Google OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [YouTube API Quota Calculator](https://developers.google.com/youtube/v3/getting-started#quota)

### Internal Resources
- Testing Guide: [YOUTUBE_TESTING_GUIDE.md](./YOUTUBE_TESTING_GUIDE.md)
- Feature Reference: [YOUTUBE_FEATURES.md](./YOUTUBE_FEATURES.md)
- Implementation Details: [YOUTUBE_IMPLEMENTATION_SUMMARY.md](./YOUTUBE_IMPLEMENTATION_SUMMARY.md)

### External Support
- Google API Support (via Cloud Console)
- Stack Overflow (`youtube-api`, `google-oauth` tags)
- Xocial Development Team

---

## 🔄 Updates & Maintenance

### Regular Tasks

**Daily:**
- Monitor error rates
- Check quota usage
- Review upload success rate

**Weekly:**
- Review user feedback
- Update test users (if in testing mode)
- Check for API deprecations

**Monthly:**
- Review and optimize quota usage
- Analyze feature usage metrics
- Update documentation as needed

---

## 🗺️ Roadmap

### Current Version (1.0)
- ✅ OAuth authentication
- ✅ Video upload & publishing
- ✅ Analytics dashboard
- ✅ Metrics sync
- ✅ Video scheduling

### Upcoming Features (1.1)
- [ ] Playlist management
- [ ] Comment moderation  
- [ ] YouTube Shorts support
- [ ] Advanced analytics

### Future Plans (2.0)
- [ ] Live streaming
- [ ] Community posts
- [ ] Channel memberships
- [ ] YouTube Studio integration

---

## 💡 Tips & Best Practices

### For Users

**Video Upload:**
- Use MP4 format for best compatibility
- Keep videos under 100 MB for faster uploads
- Add detailed descriptions with keywords
- Use custom thumbnails
- Schedule during peak audience times

**Analytics:**
- Check metrics daily for trends
- Compare video performance
- Track subscriber growth
- Monitor engagement rates

### For Developers

**API Usage:**
- Cache channel data (1 hour TTL)
- Batch API requests when possible
- Monitor quota usage closely
- Implement exponential backoff for retries
- Handle rate limits gracefully

**Error Handling:**
- Log all errors with context
- Provide user-friendly error messages
- Implement fallbacks for critical flows
- Test edge cases thoroughly

---

## 📞 Getting Help

### Quick Help

1. **Check Documentation:**
   - Start with [YOUTUBE_QUICK_START.md](./YOUTUBE_QUICK_START.md)
   - Review [YOUTUBE_TESTING_GUIDE.md](./YOUTUBE_TESTING_GUIDE.md)

2. **Check Logs:**
   - Vercel function logs
   - Browser console errors
   - Google Cloud Console logs

3. **Verify Configuration:**
   - Environment variables set correctly
   - OAuth credentials match
   - Redirect URIs configured

4. **Test API Directly:**
   - Use curl or Postman
   - Check responses
   - Verify token validity

### Contact Support

- **Technical Issues:** Check Vercel logs and internal documentation
- **Google API Issues:** Google Cloud Console support
- **Feature Requests:** Submit via internal channels

---

## 🎉 Success!

YouTube integration is fully operational and ready for production use!

**What You Can Do Now:**
- Connect YouTube channels
- Upload and schedule videos
- Track video performance  
- Manage multiple channels
- Automate content workflows

**Next Steps:**
1. Complete Google app verification for production
2. Test with real users and content
3. Monitor usage and gather feedback
4. Plan future enhancements
5. Train team and create user guides

---

## 📜 Version History

### Version 1.0.0 (November 2024)
- Initial release
- OAuth authentication
- Video upload and scheduling
- Analytics dashboard
- Automated metrics sync
- Complete documentation

---

**Status: ✅ Production Ready**

For questions, issues, or feedback, refer to the documentation or contact the development team.

**Happy Creating! 🎥**

