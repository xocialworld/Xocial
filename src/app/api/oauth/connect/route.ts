import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, requireAuth, APIError } from '@/lib/api-middleware';
import { getFacebookAuthUrl } from '@/lib/oauth/facebook';
import { getTwitterAuthUrl, generatePKCE } from '@/lib/oauth/twitter';
import { getLinkedInAuthUrl } from '@/lib/oauth/linkedin';
import { getYouTubeAuthUrl } from '@/lib/oauth/youtube';
import { getTikTokAuthUrl } from '@/lib/oauth/tiktok';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * GET /api/oauth/connect?platform=<platform>
 * Initiate OAuth flow for a specific platform
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { user } = await requireAuth(request);

  const searchParams = request.nextUrl.searchParams;
  const platform = searchParams.get('platform');

  if (!platform) {
    throw new APIError(400, 'Platform parameter is required', 'MISSING_PLATFORM');
  }

  // Generate random state for CSRF protection and include user ID
  const state = generateRandomState();
  
  let authUrl: string;
  let codeVerifier: string | undefined;

  switch (platform.toLowerCase()) {
    case 'facebook': {
      const config = {
        clientId: process.env.FACEBOOK_APP_ID!,
        clientSecret: process.env.FACEBOOK_APP_SECRET!,
        redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/facebook/callback`,
      };
      
      if (!config.clientId || !config.clientSecret) {
        throw new APIError(500, 'Facebook credentials not configured', 'MISSING_CONFIG');
      }
      
      authUrl = getFacebookAuthUrl(config, state);
      break;
    }

    case 'instagram': {
      // Instagram uses Facebook OAuth
      const config = {
        clientId: process.env.FACEBOOK_APP_ID!,
        clientSecret: process.env.FACEBOOK_APP_SECRET!,
        redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/instagram/callback`,
      };
      
      if (!config.clientId || !config.clientSecret) {
        throw new APIError(500, 'Facebook credentials not configured (required for Instagram)', 'MISSING_CONFIG');
      }
      
      authUrl = getFacebookAuthUrl(config, state);
      break;
    }

    case 'twitter': {
      const config = {
        clientId: process.env.TWITTER_CLIENT_ID!,
        clientSecret: process.env.TWITTER_CLIENT_SECRET,
        redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/twitter/callback`,
      };
      
      if (!config.clientId) {
        throw new APIError(500, 'Twitter credentials not configured', 'MISSING_CONFIG');
      }
      
      const pkce = generatePKCE();
      codeVerifier = pkce.verifier;
      authUrl = getTwitterAuthUrl(config, state, pkce.challenge);
      break;
    }

    case 'linkedin': {
      const config = {
        clientId: process.env.LINKEDIN_CLIENT_ID!,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
        redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/linkedin/callback`,
      };
      
      if (!config.clientId || !config.clientSecret) {
        throw new APIError(500, 'LinkedIn credentials not configured', 'MISSING_CONFIG');
      }
      
      authUrl = getLinkedInAuthUrl(config, state);
      break;
    }

    case 'youtube': {
      const config = {
        clientId: process.env.YOUTUBE_CLIENT_ID!,
        clientSecret: process.env.YOUTUBE_CLIENT_SECRET!,
        redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/youtube/callback`,
      };
      
      if (!config.clientId || !config.clientSecret) {
        throw new APIError(500, 'YouTube credentials not configured', 'MISSING_CONFIG');
      }
      
      authUrl = getYouTubeAuthUrl(config, state);
      break;
    }

    case 'tiktok': {
      const config = {
        clientKey: process.env.TIKTOK_CLIENT_KEY!,
        clientSecret: process.env.TIKTOK_CLIENT_SECRET!,
        redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/tiktok/callback`,
      };
      
      if (!config.clientKey || !config.clientSecret) {
        throw new APIError(500, 'TikTok credentials not configured', 'MISSING_CONFIG');
      }
      
      authUrl = getTikTokAuthUrl(config, state);
      break;
    }

    default:
      throw new APIError(400, `Unsupported platform: ${platform}`, 'INVALID_PLATFORM');
  }

  // Store state, user ID, and code verifier in session/cookies for verification
  const cookieStore = await cookies();
  cookieStore.set(`oauth_state_${platform}`, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  // Store user ID to retrieve in callback
  cookieStore.set(`oauth_user_${platform}`, user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  if (codeVerifier) {
    cookieStore.set(`oauth_verifier_${platform}`, codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });
  }

  // Redirect to OAuth provider
  return NextResponse.redirect(authUrl);
});

/**
 * Generate a random state string for CSRF protection
 */
function generateRandomState(length: number = 32): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  
  return text;
}

