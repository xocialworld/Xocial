import { NextRequest, NextResponse } from 'next/server';
import {
    withErrorHandler,
    requireAuth,
    APIError,
    getWorkspaceFromRequest,
    ensureUserProfile,
} from '@/lib/api-middleware';
import { logger } from '@/lib/logger';
import { generateState, storeOAuthState } from '@/lib/oauth/state-manager';
import { getYouTubeAuthUrl } from '@/lib/oauth/youtube';
import { getFacebookAuthUrl } from '@/lib/oauth/facebook';
import { getLinkedInAuthUrl } from '@/lib/oauth/linkedin';
import { getTikTokAuthUrl } from '@/lib/oauth/tiktok';
import { generatePKCE, getTwitterAuthUrl } from '@/lib/platforms/twitter';
import { getInstagramAuthUrl } from '@/lib/oauth/instagram';
import { OAUTH_CONFIG, OAuthPlatform } from '@/lib/oauth/oauth-config';

/**
 * GET /api/auth/connect?platform=youtube&redirect=/x
 * Unified OAuth initiation endpoint for all platforms
 * Follows SRS pattern: /api/auth/connect
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
    const { user, supabase } = await requireAuth(request);

    const searchParams = request.nextUrl.searchParams;
    const platform = searchParams.get('platform') as OAuthPlatform;
    const redirectUrl = searchParams.get('redirect') || '/x';

    if (!platform) {
        throw new APIError(400, 'Platform parameter is required', 'MISSING_PLATFORM');
    }

    if (!OAUTH_CONFIG[platform]) {
        throw new APIError(400, `Invalid platform: ${platform}`, 'INVALID_PLATFORM');
    }

    // Ensure user has a workspace (and get the specific one if requested)
    await ensureUserProfile(user, supabase);
    const workspace = await getWorkspaceFromRequest(user.id, request, supabase);

    // Generate and store state for CSRF protection
    const state = generateState();
    let pkce: { verifier: string; challenge: string } | undefined;

    // Generate PKCE for platforms that support it
    if (platform === 'twitter' || platform === 'tiktok') {
        pkce = generatePKCE();
    }

    // Store state in database
    await storeOAuthState(user.id, platform, state, redirectUrl, {
        pkceVerifier: pkce?.verifier,
        workspaceId: workspace.id,
    });

    // Get authorization URL for the platform
    let authUrl: string;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin || 'http://localhost:3000';

    try {
        switch (platform) {
            case 'youtube':
                if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET) {
                    throw new APIError(500, 'YouTube OAuth is not configured', 'YOUTUBE_OAUTH_NOT_CONFIGURED');
                }
                authUrl = getYouTubeAuthUrl(
                    {
                        clientId: process.env.YOUTUBE_CLIENT_ID!,
                        clientSecret: process.env.YOUTUBE_CLIENT_SECRET!,
                        redirectUri: `${appUrl}/api/auth/youtube/callback`,
                    },
                    state
                );
                break;

            case 'facebook':
                if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
                    throw new APIError(500, 'Facebook OAuth is not configured', 'FACEBOOK_OAUTH_NOT_CONFIGURED');
                }
                authUrl = getFacebookAuthUrl(
                    {
                        clientId: process.env.FACEBOOK_APP_ID!,
                        clientSecret: process.env.FACEBOOK_APP_SECRET!,
                        redirectUri: `${appUrl}/api/auth/facebook/callback`,
                    },
                    state,
                    false
                );
                break;

            case 'instagram':
                if (!process.env.INSTAGRAM_CLIENT_ID || !process.env.INSTAGRAM_CLIENT_SECRET) {
                    throw new APIError(500, 'Instagram OAuth is not configured', 'INSTAGRAM_OAUTH_NOT_CONFIGURED');
                }
                authUrl = getInstagramAuthUrl(
                    {
                        clientId: process.env.INSTAGRAM_CLIENT_ID!,
                        clientSecret: process.env.INSTAGRAM_CLIENT_SECRET!,
                        redirectUri: `${appUrl}/api/auth/instagram/callback`,
                    },
                    state
                );
                break;

            case 'twitter':
                if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
                    throw new APIError(500, 'Twitter OAuth is not configured', 'TWITTER_OAUTH_NOT_CONFIGURED');
                }
                logger.info('[OAuth Connect] Initiating Twitter OAuth', {
                    userId: user.id,
                    redirectUri: `${appUrl}/api/auth/twitter/callback`,
                    clientIdPrefix: process.env.TWITTER_CLIENT_ID.substring(0, 10) + '...',
                    hasPkce: !!pkce,
                    pkceChallengeLength: pkce?.challenge.length,
                });
                authUrl = getTwitterAuthUrl(
                    {
                        clientId: process.env.TWITTER_CLIENT_ID!,
                        clientSecret: process.env.TWITTER_CLIENT_SECRET!,
                        redirectUri: `${appUrl}/api/auth/twitter/callback`,
                    },
                    state,
                    pkce!.challenge
                );
                logger.info('[OAuth Connect] Twitter auth URL generated', {
                    authUrlLength: authUrl.length,
                    authUrlPrefix: authUrl.substring(0, 60) + '...',
                });
                break;

            case 'linkedin':
                if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET) {
                    throw new APIError(500, 'LinkedIn OAuth is not configured', 'LINKEDIN_OAUTH_NOT_CONFIGURED');
                }
                authUrl = getLinkedInAuthUrl(
                    {
                        clientId: process.env.LINKEDIN_CLIENT_ID!,
                        clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
                        redirectUri: `${appUrl}/api/auth/linkedin/callback`,
                    },
                    state
                );
                break;

            case 'tiktok':
                if (!process.env.TIKTOK_CLIENT_KEY || !process.env.TIKTOK_CLIENT_SECRET) {
                    throw new APIError(500, 'TikTok OAuth is not configured', 'TIKTOK_OAUTH_NOT_CONFIGURED');
                }
                authUrl = getTikTokAuthUrl(
                    {
                        clientKey: process.env.TIKTOK_CLIENT_KEY!,
                        clientSecret: process.env.TIKTOK_CLIENT_SECRET!,
                        redirectUri: `${appUrl}/api/auth/tiktok/callback`,
                    },
                    state
                );
                break;
            default:
                throw new APIError(400, `Platform ${platform} is not yet implemented`, 'PLATFORM_NOT_IMPLEMENTED');
        }

        logger.info(`[OAuth Connect] Redirecting user ${user.id} to ${platform} OAuth`);

        return NextResponse.redirect(authUrl);
    } catch (error) {
        logger.error(`[OAuth Connect] Error initiating ${platform} OAuth:`, error as Error);

        if (error instanceof APIError) {
            throw error;
        }

        throw new APIError(
            500,
            `Failed to initiate ${platform} OAuth flow`,
            'OAUTH_INIT_FAILED'
        );
    }
});

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
