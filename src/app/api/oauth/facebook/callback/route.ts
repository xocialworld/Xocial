import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserWorkspace, APIError } from '@/lib/api-middleware';
import {
  exchangeFacebookCode,
  getFacebookLongLivedToken,
  getFacebookProfile,
  getFacebookPages,
} from '@/lib/oauth/facebook';
import { verifyOAuthState } from '@/lib/oauth/state-manager';
import { encryptToken } from '@/lib/encryption';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/oauth/facebook/callback
 * Handle Facebook OAuth callback
 */
export async function GET(request: NextRequest) {
  try {
  const { user, supabase } = await requireAuth(request);

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

  // Verify state parameter for CSRF protection
  if (!state) {
    throw new APIError(400, 'State parameter is missing', 'MISSING_STATE');
  }

  const stateVerification = await verifyOAuthState(user.id, 'facebook', state);
  if (!stateVerification.valid) {
    throw new APIError(
      403,
      `OAuth state verification failed: ${stateVerification.error}`,
      'INVALID_STATE'
    );
  }

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

  // Get user's pages
  const pages = await getFacebookPages(longLivedToken.access_token);
  console.log(
    '[Facebook Callback] Pages fetched:',
    pages.length,
    pages.map((page) => ({ id: page.id, name: page.name }))
  );

  if (pages.length === 0) {
    console.warn('[Facebook Callback] No pages returned for user:', user.id);
    const accountsUrl = new URL('/x', process.env.NEXT_PUBLIC_APP_URL);
    accountsUrl.searchParams.set(
      'error',
      'No Facebook pages were returned for this account. Make sure you selected a page and granted all permissions.'
    );
    return NextResponse.redirect(accountsUrl);
  }

  // Get user's workspace
  const workspace = await getUserWorkspace(user.id);

  // Store each page as a separate social account with encrypted tokens
  const accounts = await Promise.all(
    pages.map(async (page) => {
      // Encrypt page access token before storing
      const encryptedAccessToken = encryptToken(page.access_token);

      const { data, error} = await supabase
        .from('social_accounts')
        .upsert(
          {
            workspace_id: workspace.id,
            platform: 'facebook',
            account_id: page.id,
            account_name: page.name,
            access_token: encryptedAccessToken,
            token_expires_at: new Date(
              Date.now() + longLivedToken.expires_in * 1000
            ).toISOString(),
            is_active: true,
            metadata: {
              category: page.category,
              category_list: page.category_list,
              tasks: page.tasks,
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

