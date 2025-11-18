import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  APIError,
} from '@/lib/api-middleware';
import { generateState, storeOAuthState } from '@/lib/oauth/state-manager';
import { getYouTubeAuthUrl } from '@/lib/oauth/youtube';
import { getFacebookAuthUrl } from '@/lib/oauth/facebook';
import { getLinkedInAuthUrl } from '@/lib/oauth/linkedin';
import { getTikTokAuthUrl } from '@/lib/oauth/tiktok';
import { generatePKCE, getTwitterAuthUrl } from '@/lib/oauth/twitter';

/**
 * GET /api/oauth/connect?platform=youtube&redirect=/x
 * Initiate OAuth flow for a platform
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { user } = await requireAuth(request);

  const searchParams = request.nextUrl.searchParams;
  const platform = searchParams.get('platform');
  const redirectUrl = searchParams.get('redirect') || '/x';

  if (!platform) {
    throw new APIError(400, 'Platform parameter is required', 'MISSING_PLATFORM');
  }

  const validPlatforms = ['youtube', 'facebook', 'instagram', 'twitter', 'linkedin', 'tiktok'];
  if (!validPlatforms.includes(platform)) {
    throw new APIError(400, `Invalid platform: ${platform}`, 'INVALID_PLATFORM');
  }

  // Generate and store state for CSRF protection
  const state = generateState();
  let pkce: { verifier: string; challenge: string } | undefined;
  if (platform === 'twitter') {
    pkce = generatePKCE();
  }

  await storeOAuthState(user.id, platform, state, redirectUrl, {
    pkceVerifier: pkce?.verifier,
  });

  // Get authorization URL for the platform
  let authUrl: string;
  const appUrl = request.nextUrl.origin || (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');

  switch (platform) {
    case 'youtube':
      if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET) {
        throw new APIError(500, 'YouTube OAuth is not configured. Please set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET.', 'YOUTUBE_OAUTH_NOT_CONFIGURED');
      }
      authUrl = getYouTubeAuthUrl(
        {
          clientId: process.env.YOUTUBE_CLIENT_ID!,
          clientSecret: process.env.YOUTUBE_CLIENT_SECRET!,
          redirectUri: `${appUrl}/api/oauth/youtube/callback`,
        },
        state
      );
      break;

    case 'facebook':
      if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
        throw new APIError(500, 'Facebook OAuth is not configured. Please set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET.', 'FACEBOOK_OAUTH_NOT_CONFIGURED');
      }
      authUrl = getFacebookAuthUrl(
        {
          clientId: process.env.FACEBOOK_APP_ID!,
          clientSecret: process.env.FACEBOOK_APP_SECRET!,
          redirectUri: `${appUrl}/api/oauth/facebook/callback`,
        },
        state,
        false
      );
      break;

    case 'instagram':
      if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
        throw new APIError(500, 'Instagram OAuth requires Facebook app credentials. Please set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET.', 'INSTAGRAM_OAUTH_NOT_CONFIGURED');
      }
      authUrl = getFacebookAuthUrl(
        {
          clientId: process.env.FACEBOOK_APP_ID!,
          clientSecret: process.env.FACEBOOK_APP_SECRET!,
          redirectUri: `${appUrl}/api/oauth/instagram/callback`,
        },
        state,
        true
      );
      break;

    case 'linkedin':
      authUrl = getLinkedInAuthUrl(
        {
          clientId: process.env.LINKEDIN_CLIENT_ID!,
          clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
          redirectUri: `${appUrl}/api/oauth/linkedin/callback`,
        },
        state
      );
      break;

    case 'twitter':
      if (!pkce) {
        throw new APIError(500, 'Twitter PKCE verifier not generated', 'TWITTER_OAUTH_ERROR');
      }
      authUrl = getTwitterAuthUrl(
        {
          clientId: process.env.TWITTER_CLIENT_ID!,
          clientSecret: process.env.TWITTER_CLIENT_SECRET!,
          redirectUri: `${appUrl}/api/oauth/twitter/callback`,
        },
        state,
        pkce.challenge
      );
      break;

    case 'tiktok':
      authUrl = getTikTokAuthUrl(
        {
          clientKey: process.env.TIKTOK_CLIENT_KEY!,
          clientSecret: process.env.TIKTOK_CLIENT_SECRET!,
          redirectUri: `${appUrl}/api/oauth/tiktok/callback`,
        },
        state
      );
      break;

    default:
      throw new APIError(400, `Platform not implemented: ${platform}`, 'NOT_IMPLEMENTED');
  }

  // Redirect user to platform authorization page
  return NextResponse.redirect(authUrl);
});
