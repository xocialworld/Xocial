import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  successResponse,
  getUserWorkspace,
  APIError,
} from '@/lib/api-middleware';
import { exchangeTwitterCode, getTwitterUser } from '@/lib/oauth/twitter';
import { encryptToken } from '@/lib/encryption';
import { verifyOAuthState } from '@/lib/oauth/state-manager';

/**
 * GET /api/oauth/twitter/callback
 * Handle Twitter/X OAuth callback
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    throw new APIError(400, `Twitter OAuth error: ${error}`, 'OAUTH_ERROR');
  }

  if (!code) {
    throw new APIError(400, 'Authorization code is missing', 'MISSING_CODE');
  }

  if (!state) {
    throw new APIError(400, 'State parameter is missing', 'MISSING_STATE');
  }

  const stateVerification = await verifyOAuthState(user.id, 'twitter', state);

  if (!stateVerification.valid || !stateVerification.pkceVerifier) {
    throw new APIError(
      400,
      stateVerification.error ||
        'OAuth session expired or invalid. Please try connecting again.',
      'INVALID_STATE'
    );
  }

  // Exchange code for access token
  const config = {
    clientId: process.env.TWITTER_CLIENT_ID!,
    clientSecret: process.env.TWITTER_CLIENT_SECRET,
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/twitter/callback`,
  };

  const codeVerifier = stateVerification.pkceVerifier;
  const tokenResponse = await exchangeTwitterCode(config, code, codeVerifier);

  // Get user profile
  const twitterUser = await getTwitterUser(tokenResponse.access_token);

  // Get user's workspace
  const workspace = await getUserWorkspace(user.id);

  // Store Twitter account
  const { data: account, error: dbError } = await supabase
    .from('social_accounts')
    .upsert(
      {
        workspace_id: workspace.id,
        platform: 'twitter',
        account_id: twitterUser.id,
        account_name: twitterUser.name,
        account_handle: twitterUser.username,
        account_avatar: twitterUser.profile_image_url,
        follower_count: twitterUser.public_metrics?.followers_count || 0,
        access_token: encryptToken(tokenResponse.access_token),
        refresh_token: tokenResponse.refresh_token ? encryptToken(tokenResponse.refresh_token) : null,
        token_expires_at: new Date(
          Date.now() + tokenResponse.expires_in * 1000
        ).toISOString(),
        is_active: true,
        metadata: {
          description: twitterUser.description,
          public_metrics: twitterUser.public_metrics,
        },
      },
      {
        onConflict: 'workspace_id,platform,account_id',
      }
    )
    .select()
    .single();

  if (dbError) throw dbError;
  const appUrl = request.nextUrl.origin || (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
  const redirectUrl = new URL('/x', appUrl);
  redirectUrl.searchParams.set('success', 'Twitter account connected successfully');
  return NextResponse.redirect(redirectUrl);
});

