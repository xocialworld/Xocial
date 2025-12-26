import { NextRequest, NextResponse } from 'next/server';
import {
    requireAuth,
    getUserWorkspace,
    APIError,
    ensureUserProfile,
} from '@/lib/api-middleware';
import { logger } from '@/lib/logger';
import {
    exchangeYouTubeCode,
    getYouTubeChannels,
} from '@/lib/oauth/youtube';
import { verifyOAuthState } from '@/lib/oauth/state-manager';
import { encryptToken } from '@/lib/encryption';

/**
 * GET /api/oauth/youtube/callback
 * Handle YouTube/Google OAuth callback
 */
export async function GET(request: NextRequest) {
    const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin || 'http://localhost:3000';

    try {
        logger.info('[YouTube OAuth] Callback initiated', {
            origin,
            hasCode: !!request.nextUrl.searchParams.get('code'),
            hasState: !!request.nextUrl.searchParams.get('state'),
            hasError: !!request.nextUrl.searchParams.get('error'),
        });

        // Get authenticated  user
        let authResult;
        try {
            authResult = await requireAuth(request);
        } catch (authError) {
            logger.error('[YouTube OAuth] Authentication failed in callback', authError as Error);
            const errorUrl = new URL('/x', origin);
            errorUrl.searchParams.set('error', 'Authentication failed. Please sign in and try again.');
            return NextResponse.redirect(errorUrl);
        }

        const { user, supabase } = authResult;
        logger.info('[YouTube OAuth] User authenticated', { userId: user.id });

        const searchParams = request.nextUrl.searchParams;
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
            logger.error('[YouTube OAuth] OAuth provider returned error: ' + error, new Error(`OAuth error: ${error}`));
            throw new APIError(400, `YouTube OAuth error: ${error}`, 'OAUTH_ERROR');
        }

        if (!code) {
            logger.error('[YouTube OAuth] No authorization code in callback');
            throw new APIError(400, 'Authorization code is missing. Please try connecting again.', 'MISSING_CODE');
        }

        // Verify state parameter for CSRF protection
        if (!state) {
            logger.error('[YouTube OAuth] No state parameter in callback');
            throw new APIError(400, 'State parameter is missing. Please try connecting again.', 'MISSING_STATE');
        }

        logger.info('[YouTube OAuth] Verifying state', { userId: user.id, stateLength: state.length });
        const stateVerification = await verifyOAuthState(user.id, 'youtube', state);

        if (!stateVerification.valid) {
            logger.error(
                `[YouTube OAuth] State verification failed: ${stateVerification.error}`,
                new Error(stateVerification.error || 'Unknown state verification error'),
                { userId: user.id }
            );
            throw new APIError(
                403,
                `OAuth state verification failed: ${stateVerification.error}. Please try connecting again.`,
                'INVALID_STATE'
            );
        }

        logger.info('[YouTube OAuth] State verified successfully');
        const redirectUri = `${origin}/api/auth/youtube/callback`;

        const config = {
            clientId: process.env.YOUTUBE_CLIENT_ID!,
            clientSecret: process.env.YOUTUBE_CLIENT_SECRET!,
            redirectUri,
        };

        if (!process.env.ENCRYPTION_KEY) {
            throw new APIError(500, 'Encryption key is not configured', 'CONFIGURATION_ERROR');
        }

        logger.info('[YouTube OAuth] Exchanging authorization code', {
            redirectUri,
            codeLength: code.length,
            clientIdPrefix: config.clientId.substring(0, 10) + '...',
        });

        let tokenResponse;
        try {
            tokenResponse = await exchangeYouTubeCode(config, code);
            logger.info('[YouTube OAuth] Token exchange successful', {
                hasAccessToken: !!tokenResponse.access_token,
                hasRefreshToken: !!tokenResponse.refresh_token,
                expiresIn: tokenResponse.expires_in
            });
        } catch (tokenError: any) {
            logger.error('[YouTube OAuth] Token exchange failed', tokenError, {
                errorMessage: tokenError.message,
                errorCode: tokenError.code,
            });
            throw new APIError(400, `Failed to exchange authorization code: ${tokenError.message}. Please try connecting again.`, 'TOKEN_EXCHANGE_FAILED');
        }

        // Get user's YouTube channels
        logger.info('[YouTube OAuth] Fetching YouTube channels');
        let channels;
        try {
            channels = await getYouTubeChannels(tokenResponse.access_token);
            logger.info('[YouTube OAuth] Channels fetched successfully', { channelCount: channels.length });
        } catch (channelError: any) {
            logger.error(
                '[YouTube OAuth] Failed to fetch channels',
                channelError instanceof Error ? channelError : new Error(String(channelError))
            );
            throw new APIError(500, `Failed to fetch YouTube channels: ${channelError.message}`, 'CHANNELS_FETCH_FAILED');
        }

        if (channels.length === 0) {
            logger.warn('[YouTube OAuth] No channels found for user');
            throw new APIError(404, 'No YouTube channels found for this account. Please create a channel first.', 'NO_CHANNELS');
        }

        // Ensure profile exists to satisfy RLS before workspace resolution
        await ensureUserProfile(user, supabase);

        // Get user's workspace context from state
        let workspaceId = stateVerification.workspaceId;

        if (!workspaceId) {
            logger.warn('[YouTube Callback] No workspaceId in state, falling back to default workspace');
            const workspace = await getUserWorkspace(user.id, supabase);
            workspaceId = workspace.id;
        }

        logger.info(`[YouTube Callback] Target workspace ID: ${workspaceId}`);

        // Store each channel as a separate social account with encrypted tokens
        const accounts = await Promise.all(
            channels.map(async (channel) => {
                logger.info(`[YouTube Callback] Processing channel: ${channel.snippet.title} (${channel.id})`);
                // Encrypt tokens before storing
                if (!tokenResponse.refresh_token) {
                    logger.warn('[YouTube OAuth] No refresh token received. Account may expire after 1 hour.');
                }

                const encryptedAccessToken = encryptToken(tokenResponse.access_token);
                const encryptedRefreshToken = tokenResponse.refresh_token
                    ? encryptToken(tokenResponse.refresh_token)
                    : null;

                const { data, error } = await supabase
                    .from('social_accounts')
                    .upsert(
                        {
                            workspace_id: workspaceId,
                            assigned_user_id: user.id,
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
                            access_token: encryptedAccessToken,
                            refresh_token: encryptedRefreshToken,
                            token_expires_at: new Date(
                                Date.now() + tokenResponse.expires_in * 1000
                            ).toISOString(),
                            is_active: true,
                            metadata: {
                                channel_id: channel.id,
                                channel_title: channel.snippet.title,
                                description: channel.snippet.description,
                                custom_url: channel.snippet.customUrl,
                                published_at: channel.snippet.publishedAt,
                                thumbnail_url: channel.snippet.thumbnails.high?.url || channel.snippet.thumbnails.default?.url,
                                subscriber_count: channel.statistics ? parseInt(channel.statistics.subscriberCount) : 0,
                                video_count: channel.statistics ? parseInt(channel.statistics.videoCount) : 0,
                                view_count: channel.statistics ? parseInt(channel.statistics.viewCount) : 0,
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

                if (error) {
                    logger.error(`[YouTube Callback] Error upserting account ${channel.id}:`, error);
                    throw error;
                }
                logger.info(`[YouTube Callback] Successfully upserted account ${channel.id}`);
                return data;
            })
        );

        // Trigger initial sync in background for each account
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin || 'http://localhost:3000';
        logger.info('[YouTube Callback] Triggering initial sync for connected accounts');

        accounts.forEach(account => {
            // Trigger full sync asynchronously (don't await to avoid blocking redirect)
            const syncUrl = `${appUrl}/api/youtube/sync?accountId=${account.id}&type=full`;
            fetch(syncUrl, {
                method: 'POST',
                headers: {
                    'Cookie': request.headers.get('Cookie') || '',
                },
            }).then(() => {
                logger.info(`[YouTube Callback] Initial sync triggered for account ${account.id}`);
            }).catch(err => {
                logger.warn(`[YouTube Callback] Failed to trigger initial sync for ${account.id}:`, err);
            });
        });

        // Redirect back to the UI with success message
        const redirectPath = stateVerification.redirectUrl || '/x';
        const redirectUrl = new URL(redirectPath, origin);
        redirectUrl.searchParams.set(
            'success',
            `Successfully connected ${accounts.length} YouTube channel${accounts.length > 1 ? 's' : ''}!`
        );

        logger.info('[YouTube OAuth] Connection successful, redirecting', {
            redirectPath,
            redirectUrl: redirectUrl.toString(),
            accountCount: accounts.length
        });

        return NextResponse.redirect(redirectUrl);
    } catch (error) {
        logger.error('[YouTube OAuth] Callback error occurred', error as Error, {
            errorType: error instanceof APIError ? 'APIError' : error instanceof Error ? 'Error' : 'Unknown',
            errorMessage: error instanceof Error ? error.message : String(error),
            errorCode: error instanceof APIError ? (error as any).code : undefined,
        });
        console.error('[YouTube OAuth] Full error details:', {
            error,
            stack: error instanceof Error ? error.stack : undefined,
        });

        // Redirect back to the UI with detailed error message
        const errorUrl = new URL('/x', origin);
        let errorMessage = 'Failed to connect YouTube account. Please try again.';

        if (error instanceof APIError) {
            errorMessage = error.message;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }

        errorUrl.searchParams.set('error', errorMessage);
        logger.info('[YouTube OAuth] Redirecting to error page', {
            errorUrl: errorUrl.toString(),
            errorMessage
        });

        return NextResponse.redirect(errorUrl);
    }
}

// Ensure Node.js runtime (required for crypto used by encryption utilities)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
