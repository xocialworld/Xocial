import { NextRequest, NextResponse } from 'next/server';
import {
    requireAuth,
    APIError,
} from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import { logger } from '@/lib/logger';
import {
    exchangeFacebookCode,
    getFacebookPages,
    exchangeForLongLivedToken,
} from '@/lib/oauth/facebook';
import { verifyOAuthState } from '@/lib/oauth/state-manager';
import { encryptToken } from '@/lib/encryption';
import { buildOAuthRedirectUrl, getOAuthAppOrigin } from '@/lib/oauth/redirect';

/**
 * GET /api/auth/facebook/callback
 * Handle Facebook OAuth callback
 * SRS Pattern: /api/auth/{platform}/callback
 */
export async function GET(request: NextRequest) {
    const origin = getOAuthAppOrigin(request);
    let callbackRedirectUrl: string | undefined;

    try {
        const { user } = await requireAuth(request);

        const searchParams = request.nextUrl.searchParams;
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
            throw new APIError(400, `Facebook OAuth error: ${error}`, 'OAUTH_ERROR');
        }

        if (!code) {
            throw new APIError(400, 'Authorization code is missing', 'MISSING_CODE');
        }

        // Verify state parameter for CSRF protection
        if (!state) {
            throw new APIError(400, 'State parameter is missing', 'MISSING_STATE');
        }

        const stateVerification = await verifyOAuthState(user.id, 'facebook', state);
        if (!stateVerification.valid) {
            throw new APIError(
                403,
                `OAuth state verification failed: ${stateVerification.error}`,
                'INVALID_STATE'
            );
        }
        callbackRedirectUrl = stateVerification.redirectUrl;

        const config = {
            clientId: process.env.FACEBOOK_APP_ID!,
            clientSecret: process.env.FACEBOOK_APP_SECRET!,
            redirectUri: `${origin}/api/auth/facebook/callback`,
        };

        if (!process.env.ENCRYPTION_KEY) {
            throw new APIError(500, 'Encryption key is not configured', 'CONFIGURATION_ERROR');
        }

        logger.info('[Facebook Callback] Starting callback processing...');
        const tokenResponse = await exchangeFacebookCode(config, code);
        logger.info('[Facebook Callback] Token exchanged successfully');

        // Exchange for long-lived token (60 days)
        const longLivedToken = await exchangeForLongLivedToken(
            config.clientId,
            config.clientSecret,
            tokenResponse.access_token
        );
        logger.info('[Facebook Callback] Exchanged for long-lived token');

        // Get Facebook pages
        const pages = await getFacebookPages(longLivedToken.access_token);
        logger.info(`[Facebook Callback] Found ${pages.length} Facebook pages`);

        if (pages.length === 0) {
            throw new APIError(404, 'No Facebook pages found for this account', 'NO_PAGES');
        }

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
            usage.social_profiles_count + pages.length > limits.max_social_profiles
        ) {
            throw new APIError(
                402,
                `Connecting these pages would exceed your ${limits.plan} social account limit`,
                'PLAN_LIMIT_EXCEEDED',
                {
                    current: usage.social_profiles_count,
                    adding: pages.length,
                    limit: limits.max_social_profiles,
                }
            );
        }

        logger.info(`[Facebook Callback] Target workspace ID: ${workspaceId}`);

        // Store each Facebook page as a separate social account
        const accounts = await Promise.all(
            pages.map(async (page) => {
                logger.info(`[Facebook Callback] Processing page: ${page.name} (${page.id})`);

                const encryptedAccessToken = encryptToken(page.access_token);
                const encryptedUserToken = encryptToken(longLivedToken.access_token);

                const { data, error } = await workspaceSupabase
                    .from('social_accounts')
                    .upsert(
                        {
                            workspace_id: workspaceId,
                            platform: 'facebook',
                            assigned_user_id: user.id,
                            account_id: page.id,
                            account_name: page.name,
                            account_handle: page.name,
                            account_avatar: page.picture?.data?.url,
                            follower_count: page.fan_count || 0,
                            access_token: encryptedAccessToken,
                            refresh_token: encryptedUserToken,
                            token_expires_at: new Date(
                                Date.now() + (longLivedToken.expires_in || 5184000) * 1000
                            ).toISOString(),
                            connected_at: new Date().toISOString(),
                            is_active: true,
                            metadata: {
                                category: page.category,
                                page_tasks: page.tasks || [],
                                category_list: page.category_list || [],
                                connected_via: 'facebook_login',
                            },
                        },
                        {
                            onConflict: 'workspace_id,platform,account_id',
                            ignoreDuplicates: false,
                        }
                    )
                    .select()
                    .single();

                if (error) {
                    logger.error('[Facebook Callback] Error storing account:', error);
                    throw new APIError(500, 'Failed to store Facebook account', 'DATABASE_ERROR');
                }

                return data;
            })
        );

        logger.info(`[Facebook Callback] Successfully stored ${accounts.length} accounts`);

        // Redirect to the original redirect URL with success message
        const successUrl = buildOAuthRedirectUrl(callbackRedirectUrl, origin, {
            success: 'facebook_connected',
            accounts: accounts.length,
        });

        return NextResponse.redirect(successUrl.toString());
    } catch (error) {
        console.error('[Facebook Callback] Error:', error);

        const errorMessage =
            error instanceof APIError
                ? error.message
                : error instanceof Error
                    ? error.message
                    : 'Failed to connect Facebook account';

        const errorUrl = buildOAuthRedirectUrl(callbackRedirectUrl, origin, {
            error: errorMessage,
        });

        return NextResponse.redirect(errorUrl.toString());
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
