# Facebook Pages Not Returning - Troubleshooting Guide

## The Problem

When attempting to connect a Facebook account, users are redirected back to the dashboard with this error:

```
No Facebook pages were returned for this account. Make sure you selected a page and granted all permissions.
```

This happens **even when the user has selected a Facebook page and accepted all permissions during the OAuth flow**.

## Root Causes

### 1. **Missing Advanced Access for Permissions** ⚠️ MOST COMMON

This is the **#1 reason** for this error. Facebook/Meta requires that certain permissions be granted **Advanced Access** in the Meta Developer Dashboard. Without Advanced Access:

- The `me/accounts` API endpoint will return an empty array (`data: []`)
- Even if the user selects pages during authorization
- Even if the user is an Admin of the page
- The OAuth flow completes successfully, but no pages are returned

**Required permissions that need Advanced Access:**
- `pages_show_list` - **Critical** for listing pages
- `pages_read_engagement` - For reading engagement metrics
- `pages_manage_posts` - For creating posts
- `pages_read_user_content` - For reading page content
- `pages_manage_engagement` - For managing comments/reactions

**Solution:**
1. Go to [Meta Developer Console](https://developers.facebook.com/apps)
2. Select your app
3. Navigate to **App Review → Permissions and Features**
4. For EACH permission above, click **Get Advanced Access**
5. Complete the review process (may take 3-7 business days)

**Temporary workaround for testing:**
- Add your Facebook account as an **App Tester** or **Admin**
- This allows testing in Development Mode without Advanced Access
- Go to **Roles → Roles** in Meta Dashboard
- Add testers/admins who need to test the integration

### 2. **User Role on Facebook Page**

The Facebook user must have the correct role on the page:
- ✅ **Admin** - Full access (recommended)
- ✅ **Editor** - Can manage posts and settings
- ❌ **Moderator** - Cannot grant page access to apps
- ❌ **Advertiser** - Cannot grant page access to apps
- ❌ **Analyst** - Cannot grant page access to apps

**Solution:**
1. Go to your Facebook Page
2. Click **Settings** → **Page Roles**
3. Ensure the user is listed as Admin or Editor

### 3. **Page Not Selected During Authorization**

During the Facebook OAuth dialog, users must:
1. See a list of their pages
2. **Check the box** next to each page they want to connect
3. Click "Continue" or "Done"

If no pages are checked, the app won't receive access.

**Solution:**
- Disconnect and reconnect the Facebook account
- Pay attention to the page selection dialog
- Ensure at least one page is checked before continuing

### 4. **Permissions Not Granted**

The OAuth dialog shows all requested permissions. Users can:
- Grant all permissions ✅
- Selectively deny some permissions ❌

If `pages_show_list` is denied, no pages will be returned.

**Solution:**
- The app now includes `auth_type: 'rerequest'` parameter
- This forces Facebook to show the permission dialog again
- Users can review and grant all permissions

### 5. **API Request Missing Required Fields**

The Facebook Graph API `/me/accounts` endpoint requires specific fields to be requested:
- `id` - Page ID
- `name` - Page name
- `access_token` - Page access token (critical)
- `category` - Page category
- `tasks` - What the user can do on the page

**Solution:** ✅ **Already Fixed**
- Updated `getFacebookPages()` to request: `fields=id,name,access_token,category,tasks`
- Previously was not requesting specific fields, relying on defaults

### 6. **Token Issues**

Rarely, there may be issues with the access token:
- Token expired before being exchanged
- Token doesn't include page permissions
- Token revoked by user

**Solution:**
- The app properly exchanges short-lived tokens for long-lived tokens
- Logs token expiration time for debugging
- Uses fresh tokens for the `/me/accounts` request

## Code Fixes Applied

### 1. Enhanced `getFacebookPages()` Function

**File:** `src/lib/oauth/facebook.ts`

```typescript
export async function getFacebookPages(accessToken: string): Promise<FacebookPage[]> {
  // ✅ Now explicitly requests required fields
  const fields = 'id,name,access_token,category,tasks';
  const response = await fetch(
    `https://graph.facebook.com/v24.0/me/accounts?fields=${fields}&access_token=${accessToken}`
  );

  if (!response.ok) {
    const errorData = await response.json();
    console.error('[getFacebookPages] API Error:', errorData);
    throw new Error(
      `Failed to fetch Facebook pages: ${errorData.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  console.log('[getFacebookPages] Raw API Response:', JSON.stringify(data, null, 2));
  
  // ✅ Check for errors in successful response
  if (data.error) {
    console.error('[getFacebookPages] Error in response:', data.error);
    throw new Error(`Facebook API Error: ${data.error.message}`);
  }
  
  const pages = data.data || [];
  console.log('[getFacebookPages] Parsed pages:', pages.length, pages.map((p: any) => ({ id: p.id, name: p.name })));
  
  return pages;
}
```

**Changes:**
- ✅ Explicitly request required fields (`access_token` is crucial)
- ✅ Better error handling with detailed error messages
- ✅ Log raw API response for debugging
- ✅ Check for errors even in 200 OK responses
- ✅ Log parsed pages for verification

### 2. Added `auth_type: 'rerequest'` to OAuth URL

**File:** `src/lib/oauth/facebook.ts`

```typescript
export function getFacebookAuthUrl(config: FacebookOAuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    state,
    scope: [
      'email',
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'pages_read_user_content',
      'pages_manage_engagement',
      'instagram_basic',
      'instagram_content_publish',
      'instagram_manage_comments',
      'instagram_manage_insights',
    ].join(','),
    response_type: 'code',
    auth_type: 'rerequest', // ✅ Force re-authorization to show permission dialog
  });

  return `https://www.facebook.com/v24.0/dialog/oauth?${params.toString()}`;
}
```

**Changes:**
- ✅ Added `auth_type: 'rerequest'` parameter
- This forces Facebook to show the full permission dialog
- Users can re-grant permissions if they were previously denied

### 3. Improved Error Messages and Logging

**File:** `src/app/api/oauth/facebook/callback/route.ts`

```typescript
if (pages.length === 0) {
  console.warn('[Facebook Callback] No pages returned for user:', userId);
  console.warn('[Facebook Callback] User profile:', profile);
  console.warn('[Facebook Callback] Token info - expires in:', longLivedToken.expires_in, 'seconds');
  console.warn('[Facebook Callback] IMPORTANT: Check if app has Advanced Access for permissions in Meta Dashboard');
  
  const accountsUrl = new URL('/x', process.env.NEXT_PUBLIC_APP_URL);
  accountsUrl.searchParams.set(
    'error',
    'No Facebook pages were returned. Common causes: (1) App permissions need "Advanced Access" in Meta Dashboard - check "pages_show_list" permission, (2) You must manage at least one Facebook Page as Admin/Editor, (3) You must select the page during authorization dialog. See META_APP_SETUP.md for details.'
  );
  return NextResponse.redirect(accountsUrl);
}
```

**Changes:**
- ✅ More detailed server-side logging for debugging
- ✅ Improved error message that mentions Advanced Access
- ✅ References documentation for more details

## How to Verify the Fix

### Step 1: Check Server Logs

After attempting to connect Facebook, check your server logs for these messages:

```
[Facebook Callback] Fetching pages with token...
[getFacebookPages] Raw API Response: { "data": [] }  // ← Empty array = problem!
[getFacebookPages] Parsed pages: 0 []
[Facebook Callback] Pages fetched: 0 []
[Facebook Callback] No pages returned for user: <user-id>
[Facebook Callback] IMPORTANT: Check if app has Advanced Access for permissions in Meta Dashboard
```

### Step 2: Test the Graph API Directly

Use Facebook's [Graph API Explorer](https://developers.facebook.com/tools/explorer):

1. Select your app from the dropdown
2. Click "Get User Access Token"
3. Select the `pages_show_list` permission
4. Generate token
5. Make a GET request to: `/me/accounts?fields=id,name,access_token,category,tasks`

**Expected results:**
- ✅ If you see pages: Your app has proper access
- ❌ If you see `{ "data": [] }`: You need Advanced Access for permissions

### Step 3: Check Meta Dashboard

1. Go to **App Review → Permissions and Features**
2. Look for `pages_show_list`
3. Check the status:
   - 🟢 **Advanced Access** = Good!
   - 🟡 **Standard Access** = Limited to testers/admins only
   - 🔴 **Not Approved** = Won't work

### Step 4: Add Test Users (Temporary Fix)

While waiting for Advanced Access approval:

1. Go to **Roles → Roles**
2. Click **Add Testers**
3. Enter Facebook email addresses
4. Ask them to accept at: https://www.facebook.com/settings?tab=business_tools
5. They can now connect pages in Development Mode

## Testing Checklist

Use this checklist to systematically test the fix:

- [ ] App has Advanced Access for `pages_show_list` (or user is App Tester/Admin)
- [ ] User is Admin or Editor of at least one Facebook Page
- [ ] User clicks "Connect Facebook" in the app
- [ ] OAuth dialog appears showing requested permissions
- [ ] User sees page selection dialog
- [ ] User checks the box next to the page(s)
- [ ] User grants all requested permissions
- [ ] User is redirected back to app
- [ ] Success message appears: "Facebook pages connected successfully"
- [ ] Page(s) appear in the connected accounts list

## Common Testing Mistakes

1. ❌ **Testing with a user who isn't an App Tester/Admin (without Advanced Access)**
   - Won't work in Development Mode without Advanced Access
   - Add user as tester first

2. ❌ **Not selecting pages in the OAuth dialog**
   - Pages must be explicitly checked
   - Empty selection = no pages returned

3. ❌ **Testing with a user who doesn't manage any pages**
   - User must be Admin/Editor of at least one page
   - Create a test page if needed

4. ❌ **Denying permissions during OAuth**
   - All permissions must be granted
   - Use `auth_type: 'rerequest'` to try again

5. ❌ **Not waiting for Advanced Access approval**
   - Review can take 3-7 days
   - Use App Testers in the meantime

## Quick Reference

### Check Advanced Access Status
```
Meta Dashboard → App Review → Permissions and Features → Look for green "Advanced Access" badge
```

### Add App Testers
```
Meta Dashboard → Roles → Roles → Add Testers → Enter email → They accept at facebook.com/settings?tab=business_tools
```

### Test API Directly
```
Graph API Explorer → Select app → Get token with pages_show_list → GET /me/accounts?fields=id,name,access_token
```

### Check Server Logs
```
Look for: "[getFacebookPages] Raw API Response"
If data: [] = Need Advanced Access or user isn't Admin/Tester
```

## Next Steps

1. **Immediate:** Add yourself as App Tester/Admin to test
2. **Short-term:** Submit for Advanced Access for `pages_show_list` and other permissions
3. **Testing:** Use the improved logging to debug any remaining issues
4. **Documentation:** Update user-facing docs to mention page selection requirement

## Related Documentation

- `META_APP_SETUP.md` - Complete Meta app configuration guide
- `FACEBOOK_TESTING_GUIDE.md` - Testing procedures for Facebook integration
- `ENV_VARIABLES_REFERENCE.md` - Environment variable configuration

## Support

If you still see this error after following this guide:

1. Check server logs for the raw API response
2. Verify Advanced Access status in Meta Dashboard
3. Confirm user is Admin/Editor of a page
4. Test with Graph API Explorer to isolate the issue
5. Review Facebook's [Business Tools troubleshooting](https://www.facebook.com/business/help)

---

**Last Updated:** November 11, 2025  
**Related Issue:** Facebook pages not returning despite selection and permissions  
**Status:** ✅ Code fixes applied, awaiting Advanced Access approval

