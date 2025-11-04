import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import {
  withErrorHandler,
  requireAuth,
  successResponse,
  getUserWorkspace,
  APIError,
} from '@/lib/api-middleware';
import { exchangeTwitterCode, getTwitterUser } from '@/lib/oauth/twitter';

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

  // Retrieve code_verifier from cookie (stored during auth initiation)
  const cookieStore = await cookies();
  const codeVerifier = cookieStore.get('oauth_verifier_twitter')?.value;
  const storedState = cookieStore.get('oauth_state_twitter')?.value;

  if (!codeVerifier) {
    // Log for debugging
    console.error('Twitter OAuth: Code verifier missing from cookies');
    throw new APIError(
      400, 
      'OAuth session expired or cookies were blocked. Please try connecting again and ensure cookies are enabled.',
      'MISSING_VERIFIER'
    );
  }

  // Verify state parameter for CSRF protection
  if (state && storedState && state !== storedState) {
    console.error('Twitter OAuth: State mismatch', { state, storedState });
    throw new APIError(
      400, 
      'Security validation failed. Please try connecting again.',
      'INVALID_STATE'
    );
  }

  // Clear the OAuth cookies
  cookieStore.delete('oauth_verifier_twitter');
  cookieStore.delete('oauth_state_twitter');

  // Exchange code for access token
  const config = {
    clientId: process.env.TWITTER_CLIENT_ID!,
    clientSecret: process.env.TWITTER_CLIENT_SECRET,
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/twitter/callback`,
  };

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
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token,
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

  return successResponse({
    message: 'Twitter account connected successfully',
    account,
  });
});

