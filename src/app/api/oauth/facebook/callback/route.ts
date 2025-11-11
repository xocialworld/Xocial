import { NextRequest, NextResponse } from 'next/server';
import {
  getUserWorkspace,
} from '@/lib/api-middleware';
import {
  exchangeFacebookCode,
  getFacebookLongLivedToken,
  getFacebookProfile,
  getFacebookPages,
} from '@/lib/oauth/facebook';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

/**
 * GET /api/oauth/facebook/callback
 * Handle Facebook OAuth callback
 */
export async function GET(request: NextRequest) {
  try {
  // Get user ID from OAuth cookie
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  console.log('[Facebook Callback] All cookies:', allCookies.map(c => c.name));
  
  const userId = cookieStore.get('oauth_user_facebook')?.value;
  console.log('[Facebook Callback] User ID from cookie:', userId);
  
  if (!userId) {
    console.error('[Facebook Callback] No user ID found in cookie');
    // Redirect to login with error message
    const loginUrl = new URL('/auth/login', process.env.NEXT_PUBLIC_APP_URL);
    loginUrl.searchParams.set('error', 'Session expired. Please try connecting again.');
    return NextResponse.redirect(loginUrl);
  }
  
  // Create Supabase client
  const supabase = await createClient();
  
  // Create a user object from the stored ID
  const user = { id: userId };
  
  // Clear the OAuth cookie
  cookieStore.delete('oauth_user_facebook');

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    const accountsUrl = new URL('/x', process.env.NEXT_PUBLIC_APP_URL);
    accountsUrl.searchParams.set('error', `Facebook OAuth error: ${error}`);
    return NextResponse.redirect(accountsUrl);
  }

  if (!code) {
    const accountsUrl = new URL('/x', process.env.NEXT_PUBLIC_APP_URL);
    accountsUrl.searchParams.set('error', 'Authorization code is missing');
    return NextResponse.redirect(accountsUrl);
  }

  // TODO: Verify state parameter matches what was stored in session

  // Exchange code for access token
  const config = {
    clientId: process.env.FACEBOOK_APP_ID!,
    clientSecret: process.env.FACEBOOK_APP_SECRET!,
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/facebook/callback`,
  };

  const tokenResponse = await exchangeFacebookCode(config, code);

  // Get long-lived token
  const longLivedToken = await getFacebookLongLivedToken(
    config,
    tokenResponse.access_token
  );

  // Get user profile
  const profile = await getFacebookProfile(longLivedToken.access_token);

  const now = new Date();
  const userTokenExpiresAt = new Date(
    now.getTime() + longLivedToken.expires_in * 1000
  ).toISOString();
  const profileSyncedAt = now.toISOString();

  // Get user's pages
  console.log('[Facebook Callback] Fetching pages with token...');
  const pages = await getFacebookPages(longLivedToken.access_token);
  console.log(
    '[Facebook Callback] Pages fetched:',
    pages.length,
    pages.map((page) => ({ id: page.id, name: page.name }))
  );

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

  // Get user's workspace
  const workspace = await getUserWorkspace(user.id);

  // Store each page as a separate social account
  const accounts = await Promise.all(
    pages.map(async (page) => {
      const { data, error } = await supabase
        .from('social_accounts')
        .upsert(
          {
            workspace_id: workspace.id,
            platform: 'facebook',
            account_id: page.id,
            account_name: page.name,
            access_token: page.access_token,
            token_expires_at: userTokenExpiresAt,
            is_active: true,
            metadata: {
              facebook_page: {
                id: page.id,
                name: page.name,
                category: page.category ?? null,
              },
              user_profile: {
                id: profile.id,
                name: profile.name,
                email: profile.email ?? null,
                picture_url: profile.picture?.data?.url ?? null,
                synced_at: profileSyncedAt,
              },
              user_token: {
                access_token: longLivedToken.access_token,
                expires_at: userTokenExpiresAt,
                token_type: longLivedToken.token_type,
              },
            },
          },
          {
            onConflict: 'workspace_id,platform,account_id',
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    })
  );

  // Redirect to accounts page with success message
  const accountsUrl = new URL('/x', process.env.NEXT_PUBLIC_APP_URL);
  accountsUrl.searchParams.set('success', 'Facebook pages connected successfully');
  return NextResponse.redirect(accountsUrl);
  } catch (error) {
    console.error('Facebook OAuth callback error:', error);
    
    // Redirect to accounts page with error message
    const accountsUrl = new URL('/x', process.env.NEXT_PUBLIC_APP_URL);
    accountsUrl.searchParams.set('error', error instanceof Error ? error.message : 'Failed to connect Facebook account');
    return NextResponse.redirect(accountsUrl);
  }
}

