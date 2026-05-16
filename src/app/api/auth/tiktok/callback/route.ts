import { NextRequest, NextResponse } from 'next/server';
import {
    requireAuth,
    APIError,
} from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import { logger } from '@/lib/logger';
import {
    exchangeTikTokCode,
    getTikTokUserInfo,
} from '@/lib/oauth/tiktok';
import { verifyOAuthState } from '@/lib/oauth/state-manager';
import { encryptToken } from '@/lib/encryption';

/**
 * GET /api/auth/tiktok/callback
 * Handle TikTok OAuth 2.0 callback
 * SRS Pattern: /api/auth/{platform}/callback
 */
export async function GET(request: NextRequest) {
    try {
        const { user } = await requireAuth(request);

        const searchParams = request.nextUrl.searchParams;
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
            throw new APIError(400, `TikTok OAuth error: ${error}`, 'OAUTH_ERROR');
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

        const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin || 'http://localhost:3000';
        const config = {
            clientKey: process.env.TIKTOK_CLIENT_KEY!,
            clientSecret: process.env.TIKTOK_CLIENT_SECRET!,
            redirectUri: `${origin}/api/auth/tiktok/callback`,
        };

        if (!process.env.ENCRYPTION_KEY) {
            throw new APIError(500, 'Encryption key is not configured', 'CONFIGURATION_ERROR');
        }

        console.log('[TikTok Callback] Starting callback processing...');
        const tokenResponse = await exchangeTikTokCode(config, code);
        console.log('[TikTok Callback] Token exchanged successfully');

        // Get TikTok user info
        const userInfo = await getTikTokUserInfo(tokenResponse.access_token);
        console.log(`[TikTok Callback] Found user: ${userInfo.display_name}`);

        const workspaceId = stateVerification.workspaceId;
        if (!workspaceId) {
            throw new APIError(
                400,
                'Workspace context is missing from OAuth state. Please restart the connection from the selected workspace.',
                'WORKSPACE_REQUIRED'
            );
        }

        const { userClient: workspaceSupabase, usage, limits } = await requireWorkspaceContext(request, {
            workspaceId,
            roles: ['owner', 'admin', 'manager'],
        });

        if (
            limits.max_social_profiles !== null &&
            limits.max_social_profiles !== undefined &&
            usage.social_profiles_count + 1 > limits.max_social_profiles
        ) {
            throw new APIError(
                402,
                `Connecting this account would exceed your ${limits.plan} social account limit`,
                'PLAN_LIMIT_EXCEEDED',
                {
                    current: usage.social_profiles_count,
                    adding: 1,
                    limit: limits.max_social_profiles,
                }
            );
        }

        console.log(`[TikTok Callback] Target workspace ID: ${workspaceId}`);

        // Encrypt tokens before storing
        const encryptedAccessToken = encryptToken(tokenResponse.access_token);
        const encryptedRefreshToken = tokenResponse.refresh_token
            ? encryptToken(tokenResponse.refresh_token)
            : null;

        // Store TikTok account
        const { data, error: dbError } = await workspaceSupabase
            .from('social_accounts')
            .upsert(
                {
                    workspace_id: workspaceId,
                    platform: 'tiktok',
                    assigned_user_id: user.id,
                    account_id: userInfo.open_id,
                    account_name: userInfo.display_name || 'TikTok User',
                    account_handle: userInfo.display_name || userInfo.open_id,
                    account_avatar: userInfo.avatar_url || userInfo.avatar_url_100 || userInfo.avatar_large_url,
                    follower_count: userInfo.follower_count || 0,
                    access_token: encryptedAccessToken,
                    refresh_token: encryptedRefreshToken,
                    token_expires_at: new Date(
                        Date.now() + (tokenResponse.expires_in || 86400) * 1000
                    ).toISOString(),
                    connected_at: new Date().toISOString(),
                    is_active: true,
                    metadata: {
                        unionId: userInfo.union_id,
                        bioDescription: userInfo.bio_description,
                        profileDeepLink: userInfo.profile_deep_link,
                        isVerified: userInfo.is_verified,
                        followingCount: userInfo.following_count,
                        likesCount: userInfo.likes_count,
                        videoCount: userInfo.video_count,
                    },
                },
                {
                    onConflict: 'workspace_id,platform,account_id',
                    ignoreDuplicates: false,
                }
            )
            .select()
            .single();

        if (dbError) {
            console.error('[TikTok Callback] Error storing account:', dbError);
            throw new APIError(500, 'Failed to store TikTok account', 'DATABASE_ERROR');
        }

        console.log('[TikTok Callback] Successfully stored account');

        // Redirect to the original redirect URL with success message
        const redirectUrl = stateVerification.redirectUrl || '/x';
        const successUrl = new URL(redirectUrl, origin);
        successUrl.searchParams.set('success', 'tiktok_connected');

        return NextResponse.redirect(successUrl.toString());
    } catch (error) {
        console.error('[TikTok Callback] Error:', error);

        const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin || 'http://localhost:3000';
        const errorUrl = new URL('/x', origin);

        if (error instanceof APIError) {
            errorUrl.searchParams.set('error', error.message);
        } else if (error instanceof Error) {
            errorUrl.searchParams.set('error', error.message);
        } else {
            errorUrl.searchParams.set('error', 'Failed to connect TikTok account');
        }

        return NextResponse.redirect(errorUrl.toString());
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
