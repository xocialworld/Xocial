import { NextRequest, NextResponse } from 'next/server';
import {
    requireAuth,
    getUserWorkspace,
    APIError,
    ensureUserProfile,
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
 * Handle Twitter OAuth 2.0 callback with PKCE
 * SRS Pattern: /api/auth/{platform}/callback
 */
export async function GET(request: NextRequest) {
    const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin || 'http://localhost:3000';

    try {
        logger.info('[Twitter OAuth] Callback initiated', {
            origin,
            hasCode: !!request.nextUrl.searchParams.get('code'),
            hasState: !!request.nextUrl.searchParams.get('state'),
            hasError: !!request.nextUrl.searchParams.get('error'),
        });

        // Get authenticated user - handle auth failure gracefully
        let authResult;
        try {
            authResult = await requireAuth(request);
        } catch (authError) {
            logger.error('[Twitter OAuth] Authentication failed in callback', authError as Error);
            const errorUrl = new URL('/x', origin);
            errorUrl.searchParams.set('error', 'Authentication failed. Please sign in and try again.');
            return NextResponse.redirect(errorUrl);
        }

        const { user, supabase } = authResult;
        logger.info('[Twitter OAuth] User authenticated', { userId: user.id });

        const searchParams = request.nextUrl.searchParams;
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Handle OAuth errors from Twitter
        if (error) {
            const errorMessage = errorDescription || error;
            logger.error('[Twitter OAuth] OAuth provider returned error: ' + errorMessage, new Error(`OAuth error: ${error}`));
            throw new APIError(400, `Twitter OAuth error: ${errorMessage}`, 'OAUTH_ERROR');
        }

        if (!code) {
            logger.error('[Twitter OAuth] No authorization code in callback');
            throw new APIError(400, 'Authorization code is missing. Please try connecting again.', 'MISSING_CODE');
        }

        // Verify state parameter for CSRF protection
        if (!state) {
            logger.error('[Twitter OAuth] No state parameter in callback');
            throw new APIError(400, 'State parameter is missing. Please try connecting again.', 'MISSING_STATE');
        }

        logger.info('[Twitter OAuth] Verifying state', { userId: user.id, stateLength: state.length });
        const stateVerification = await verifyOAuthState(user.id, 'twitter', state);

        if (!stateVerification.valid) {
            logger.error(
                `[Twitter OAuth] State verification failed: ${stateVerification.error}`,
                new Error(stateVerification.error || 'Unknown state verification error'),
                { userId: user.id }
            );
            throw new APIError(
                403,
                `OAuth state verification failed: ${stateVerification.error}. Please try connecting again.`,
                'INVALID_STATE'
            );
        }

        logger.info('[Twitter OAuth] State verified successfully');

        // Get PKCE verifier from state - required for Twitter OAuth 2.0
        const pkceVerifier = stateVerification.pkceVerifier;
        if (!pkceVerifier) {
            logger.error('[Twitter OAuth] PKCE verifier missing from state');
            throw new APIError(400, 'PKCE verifier is missing. Please try connecting again.', 'MISSING_PKCE_VERIFIER');
        }

        const redirectUri = `${origin}/api/auth/twitter/callback`;
        const config = {
            clientId: process.env.TWITTER_CLIENT_ID!,
            clientSecret: process.env.TWITTER_CLIENT_SECRET!,
            redirectUri,
        };

        if (!process.env.ENCRYPTION_KEY) {
            throw new APIError(500, 'Encryption key is not configured', 'CONFIGURATION_ERROR');
        }

        logger.info('[Twitter OAuth] Exchanging authorization code', {
            redirectUri,
            codeLength: code.length,
            clientIdPrefix: config.clientId.substring(0, 10) + '...',
        });

        // Exchange code for tokens
        let tokenResponse;
        try {
            tokenResponse = await exchangeTwitterCode(config, code, pkceVerifier);
            logger.info('[Twitter OAuth] Token exchange successful', {
                hasAccessToken: !!tokenResponse.access_token,
                hasRefreshToken: !!tokenResponse.refresh_token,
                expiresIn: tokenResponse.expires_in,
            });
        } catch (tokenError: any) {
            logger.error('[Twitter OAuth] Token exchange failed', tokenError, {
                errorMessage: tokenError.message,
                errorCode: tokenError.code,
            });
            throw new APIError(400, `Failed to exchange authorization code: ${tokenError.message}. Please try connecting again.`, 'TOKEN_EXCHANGE_FAILED');
        }

        // Get Twitter user profile
        logger.info('[Twitter OAuth] Fetching Twitter user profile');
        let profile;
        try {
            profile = await getTwitterUser(tokenResponse.access_token);
            logger.info('[Twitter OAuth] Profile fetched successfully', {
                username: profile.username,
                userId: profile.id,
            });
        } catch (profileError: any) {
            logger.error('[Twitter OAuth] Failed to fetch user profile', profileError);
            throw new APIError(500, `Failed to fetch Twitter profile: ${profileError.message}`, 'PROFILE_FETCH_FAILED');
        }

        // Ensure profile exists to satisfy RLS before workspace resolution
        await ensureUserProfile(user, supabase);

        // Get user's workspace context from state
        let workspaceId = stateVerification.workspaceId;

        if (!workspaceId) {
            logger.warn('[Twitter OAuth] No workspaceId in state, falling back to default workspace');
            const workspace = await getUserWorkspace(user.id, supabase);
            workspaceId = workspace.id;
        }

        logger.info('[Twitter OAuth] Workspace context resolved', { workspaceId });

        // Encrypt tokens before storing
        const encryptedAccessToken = encryptToken(tokenResponse.access_token);
        const encryptedRefreshToken = tokenResponse.refresh_token
            ? encryptToken(tokenResponse.refresh_token)
            : null;

        // Store Twitter account
        logger.info('[Twitter OAuth] Storing account in database');
        const { data: accountData, error: dbError } = await supabase
            .from('social_accounts')
            .upsert(
                {
                    workspace_id: workspaceId,
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
            logger.error('[Twitter OAuth] Error storing account:', dbError);
            throw new APIError(500, 'Failed to store Twitter account', 'DATABASE_ERROR');
        }

        logger.info('[Twitter OAuth] Account stored successfully', {
            accountId: accountData.id,
            handle: profile.username,
        });

        // Redirect to the original redirect URL with success message
        const redirectPath = stateVerification.redirectUrl || '/x';
        const successUrl = new URL(redirectPath, origin);
        successUrl.searchParams.set('success', `Successfully connected @${profile.username}!`);

        logger.info('[Twitter OAuth] Connection successful, redirecting', {
            redirectPath,
            redirectUrl: successUrl.toString(),
        });

        return NextResponse.redirect(successUrl.toString());
    } catch (error) {
        logger.error('[Twitter OAuth] Callback error occurred', error as Error, {
            errorType: error instanceof APIError ? 'APIError' : error instanceof Error ? 'Error' : 'Unknown',
            errorMessage: error instanceof Error ? error.message : String(error),
            errorCode: error instanceof APIError ? (error as any).code : undefined,
        });
        console.error('[Twitter OAuth] Full error details:', {
            error,
            stack: error instanceof Error ? error.stack : undefined,
        });

        // Redirect back to the UI with detailed error message
        const errorUrl = new URL('/x', origin);
        let errorMessage = 'Failed to connect Twitter account. Please try again.';

        if (error instanceof APIError) {
            errorMessage = error.message;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }

        errorUrl.searchParams.set('error', errorMessage);
        logger.info('[Twitter OAuth] Redirecting to error page', {
            errorUrl: errorUrl.toString(),
            errorMessage,
        });

        return NextResponse.redirect(errorUrl.toString());
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
