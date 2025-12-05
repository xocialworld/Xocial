import { NextRequest, NextResponse } from 'next/server';
import {
    requireAuth,
    getUserWorkspace,
    APIError,
} from '@/lib/api-middleware';
import { logger } from '@/lib/logger';
import {
    exchangeTwitterCode,
    getTwitterUser,
} from '@/lib/platforms/twitter';
import { verifyOAuthState } from '@/lib/oauth/state-manager';
import { encryptToken } from '@/lib/encryption';

/**
 * GET /api/auth/twitter/callback
 * Handle Twitter OAuth 2.0 callback
 * SRS Pattern: /api/auth/{platform}/callback
 */
export async function GET(request: NextRequest) {
    try {
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

        // Verify state parameter for CSRF protection
        if (!state) {
            throw new APIError(400, 'State parameter is missing', 'MISSING_STATE');
        }

        const stateVerification = await verifyOAuthState(user.id, 'twitter', state);
        if (!stateVerification.valid) {
            throw new APIError(
                403,
                `OAuth state verification failed: ${stateVerification.error}`,
                'INVALID_STATE'
            );
        }

        // Get PKCE verifier from state
        const pkceVerifier = stateVerification.pkceVerifier;
        if (!pkceVerifier) {
            throw new APIError(400, 'PKCE verifier is missing', 'MISSING_PKCE_VERIFIER');
        }

        const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin || 'http://localhost:3000';
        const config = {
            clientId: process.env.TWITTER_CLIENT_ID!,
            clientSecret: process.env.TWITTER_CLIENT_SECRET!,
            redirectUri: `${origin}/api/auth/twitter/callback`,
        };

        if (!process.env.ENCRYPTION_KEY) {
            throw new APIError(500, 'Encryption key is not configured', 'CONFIGURATION_ERROR');
        }

        console.log('[Twitter Callback] Starting callback processing...');
        const tokenResponse = await exchangeTwitterCode(config, code, pkceVerifier);
        console.log('[Twitter Callback] Token exchanged successfully');

        // Get Twitter user profile
        const profile = await getTwitterUser(tokenResponse.access_token);
        console.log(`[Twitter Callback] Found profile: @${profile.username}`);

        // Get user's workspace
        const workspace = await getUserWorkspace(user.id, supabase);
        console.log(`[Twitter Callback] User workspace: ${workspace.id}`);

        // Encrypt tokens before storing
        const encryptedAccessToken = encryptToken(tokenResponse.access_token);
        const encryptedRefreshToken = tokenResponse.refresh_token
            ? encryptToken(tokenResponse.refresh_token)
            : null;

        // Store Twitter account
        const { data, error: dbError } = await supabase
            .from('social_accounts')
            .upsert(
                {
                    workspace_id: workspace.id,
                    platform: 'twitter',
                    assigned_user_id: user.id,
                    account_id: profile.id,
                    account_name: profile.name,
                    account_handle: profile.username,
                    account_avatar: profile.profile_image_url,
                    follower_count: profile.public_metrics?.followers_count || 0,
                    access_token: encryptedAccessToken,
                    refresh_token: encryptedRefreshToken,
                    token_expires_at: new Date(
                        Date.now() + (tokenResponse.expires_in || 7200) * 1000
                    ).toISOString(),
                    connected_at: new Date().toISOString(),
                    is_active: true,
                    metadata: {
                        description: profile.description,
                        verified: profile.verified,
                        followingCount: profile.public_metrics?.following_count,
                        tweetCount: profile.public_metrics?.tweet_count,
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
            console.error('[Twitter Callback] Error storing account:', dbError);
            throw new APIError(500, 'Failed to store Twitter account', 'DATABASE_ERROR');
        }

        console.log('[Twitter Callback] Successfully stored account');

        // Redirect to the original redirect URL with success message
        const redirectUrl = stateVerification.redirectUrl || '/x';
        const successUrl = new URL(redirectUrl, origin);
        successUrl.searchParams.set('success', 'twitter_connected');

        return NextResponse.redirect(successUrl.toString());
    } catch (error) {
        console.error('[Twitter Callback] Error:', error);

        const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin || 'http://localhost:3000';
        const errorUrl = new URL('/x', origin);

        if (error instanceof APIError) {
            errorUrl.searchParams.set('error', error.message);
        } else if (error instanceof Error) {
            errorUrl.searchParams.set('error', error.message);
        } else {
            errorUrl.searchParams.set('error', 'Failed to connect Twitter account');
        }

        return NextResponse.redirect(errorUrl.toString());
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
