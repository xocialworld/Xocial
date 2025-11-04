import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  successResponse,
  getUserWorkspace,
  APIError,
} from '@/lib/api-middleware';
import {
  exchangeYouTubeCode,
  getYouTubeChannels,
} from '@/lib/oauth/youtube';

/**
 * GET /api/oauth/youtube/callback
 * Handle YouTube/Google OAuth callback
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    throw new APIError(400, `YouTube OAuth error: ${error}`, 'OAUTH_ERROR');
  }

  if (!code) {
    throw new APIError(400, 'Authorization code is missing', 'MISSING_CODE');
  }

  // TODO: Verify state parameter matches what was stored in session

  // Exchange code for access token
  const config = {
    clientId: process.env.YOUTUBE_CLIENT_ID!,
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET!,
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/youtube/callback`,
  };

  const tokenResponse = await exchangeYouTubeCode(config, code);

  // Get user's YouTube channels
  const channels = await getYouTubeChannels(tokenResponse.access_token);

  if (channels.length === 0) {
    throw new APIError(404, 'No YouTube channels found for this account', 'NO_CHANNELS');
  }

  // Get user's workspace
  const workspace = await getUserWorkspace(user.id);

  // Store each channel as a separate social account
  const accounts = await Promise.all(
    channels.map(async (channel) => {
      const { data, error } = await supabase
        .from('social_accounts')
        .upsert(
          {
            workspace_id: workspace.id,
            platform: 'youtube',
            account_id: channel.id,
            account_name: channel.snippet.title,
            account_handle: channel.snippet.customUrl || channel.snippet.title,
            account_avatar:
              channel.snippet.thumbnails.high?.url ||
              channel.snippet.thumbnails.medium?.url ||
              channel.snippet.thumbnails.default?.url,
            follower_count: channel.statistics
              ? parseInt(channel.statistics.subscriberCount)
              : 0,
            access_token: tokenResponse.access_token,
            refresh_token: tokenResponse.refresh_token,
            token_expires_at: new Date(
              Date.now() + tokenResponse.expires_in * 1000
            ).toISOString(),
            is_active: true,
            metadata: {
              description: channel.snippet.description,
              statistics: channel.statistics,
              brandingSettings: channel.brandingSettings,
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

  return successResponse({
    message: `YouTube channel${accounts.length > 1 ? 's' : ''} connected successfully`,
    accounts,
  });
});

