import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  successResponse,
  getUserWorkspace,
  APIError,
} from '@/lib/api-middleware';
import {
  exchangeTikTokCode,
  getTikTokUserInfo,
} from '@/lib/oauth/tiktok';
import { verifyOAuthState } from '@/lib/oauth/state-manager';

/**
 * GET /api/oauth/tiktok/callback
 * Handle TikTok OAuth callback
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    throw new APIError(
      400,
      `TikTok OAuth error: ${errorDescription || error}`,
      'OAUTH_ERROR'
    );
  }

  if (!code) {
    throw new APIError(400, 'Authorization code is missing', 'MISSING_CODE');
  }

  // Verify state parameter for CSRF protection
  if (!state) {
    throw new APIError(400, 'State parameter is missing', 'MISSING_STATE');
  }

  const stateVerification = await verifyOAuthState(user.id, 'tiktok', state);
  if (!stateVerification.valid) {
    throw new APIError(
      403,
      `OAuth state verification failed: ${stateVerification.error}`,
      'INVALID_STATE'
    );
  }

  // Exchange code for access token
  const config = {
    clientKey: process.env.TIKTOK_CLIENT_KEY!,
    clientSecret: process.env.TIKTOK_CLIENT_SECRET!,
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/tiktok/callback`,
  };

  const tokenResponse = await exchangeTikTokCode(config, code);

  // Get user info
  const userInfo = await getTikTokUserInfo(tokenResponse.access_token);

  // Get user's workspace
  const workspace = await getUserWorkspace(user.id);

  // Store TikTok account
  const { data: account, error: dbError } = await supabase
    .from('social_accounts')
    .upsert(
      {
        workspace_id: workspace.id,
        platform: 'tiktok',
        account_id: userInfo.open_id,
        account_name: userInfo.display_name || 'TikTok User',
        account_handle: userInfo.display_name || userInfo.open_id,
        account_avatar: userInfo.avatar_large_url || userInfo.avatar_url,
        follower_count: userInfo.follower_count || 0,
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token,
        token_expires_at: new Date(
          Date.now() + tokenResponse.expires_in * 1000
        ).toISOString(),
        is_active: true,
        metadata: {
          union_id: userInfo.union_id,
          bio_description: userInfo.bio_description,
          profile_deep_link: userInfo.profile_deep_link,
          is_verified: userInfo.is_verified,
          following_count: userInfo.following_count,
          likes_count: userInfo.likes_count,
          video_count: userInfo.video_count,
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
    message: 'TikTok account connected successfully',
    account,
  });
});

