import { NextRequest, NextResponse } from 'next/server';
import {
    requireAuth,
    getUserWorkspace,
    APIError,
} from '@/lib/api-middleware';
import { logger } from '@/lib/logger';
import {
    exchangeInstagramCode,
    getInstagramBusinessAccounts,
} from '@/lib/oauth/instagram';
import { getFacebookPages } from '@/lib/oauth/facebook';
import { verifyOAuthState } from '@/lib/oauth/state-manager';
import { encryptToken } from '@/lib/encryption';

/**
 * GET /api/auth/instagram/callback
 * Handle Instagram OAuth callback
 * SRS Pattern: /api/auth/{platform}/callback
 * 
 * Instagram uses Facebook's Graph API for business accounts
 */
export async function GET(request: NextRequest) {
    try {
        const { user, supabase } = await requireAuth(request);

        const searchParams = request.nextUrl.searchParams;
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
            throw new APIError(400, `Instagram OAuth error: ${error}`, 'OAUTH_ERROR');
        }

        if (!code) {
            throw new APIError(400, 'Authorization code is missing', 'MISSING_CODE');
        }

        // Verify state parameter for CSRF protection
        if (!state) {
            throw new APIError(400, 'State parameter is missing', 'MISSING_STATE');
        }

        const stateVerification = await verifyOAuthState(user.id, 'instagram', state);
        if (!stateVerification.valid) {
            throw new APIError(
                403,
                `OAuth state verification failed: ${stateVerification.error}`,
                'INVALID_STATE'
            );
        }

        const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin || 'http://localhost:3000';
        const config = {
            clientId: process.env.INSTAGRAM_CLIENT_ID!,
            clientSecret: process.env.INSTAGRAM_CLIENT_SECRET!,
            redirectUri: `${origin}/api/auth/instagram/callback`,
        };

        if (!process.env.ENCRYPTION_KEY) {
            throw new APIError(500, 'Encryption key is not configured', 'CONFIGURATION_ERROR');
        }

        logger.info('[Instagram Callback] Starting callback processing...');
        const tokenResponse = await exchangeInstagramCode(config, code);
        logger.info('[Instagram Callback] Token exchanged successfully');

        // Get Facebook pages (Instagram business accounts are linked to Facebook pages)
        const pages = await getFacebookPages(tokenResponse.access_token);
        logger.info(`[Instagram Callback] Found ${pages.length} Facebook pages`);

        if (pages.length === 0) {
            throw new APIError(404, 'No Facebook pages found. Instagram business accounts must be linked to a Facebook page.', 'NO_PAGES');
        }

        // Get user's workspace
        const workspace = await getUserWorkspace(user.id, supabase);
        logger.info(`[Instagram Callback] User workspace: ${workspace.id}`);

        // Find Instagram business accounts linked to Facebook pages
        const instagramAccounts = [];
        for (const page of pages) {
            try {
                const igAccount = await getInstagramBusinessAccounts(page.access_token, page.id);
                if (igAccount) {
                    instagramAccounts.push({
                        ...igAccount,
                        pageAccessToken: page.access_token,
                        pageName: page.name,
                    });
                }
            } catch (error) {
                logger.warn(`[Instagram Callback] No Instagram account for page ${page.name}:`, { error: error as Error });
            }
        }

        if (instagramAccounts.length === 0) {
            throw new APIError(
                404,
                'No Instagram business accounts found. Please connect an Instagram business account to your Facebook page.',
                'NO_INSTAGRAM_ACCOUNTS'
            );
        }

        // Store each Instagram account
        const accounts = await Promise.all(
            instagramAccounts.map(async (igAccount) => {
                logger.info(`[Instagram Callback] Processing account: ${igAccount.username} (${igAccount.id})`);

                const encryptedAccessToken = encryptToken(igAccount.pageAccessToken);

                const { data, error } = await supabase
                    .from('social_accounts')
                    .upsert(
                        {
                            workspace_id: workspace.id,
                            platform: 'instagram',
                            assigned_user_id: user.id,
                            account_id: igAccount.id,
                            account_name: igAccount.name || igAccount.username,
                            account_handle: igAccount.username,
                            account_avatar: igAccount.profile_picture_url,
                            follower_count: igAccount.followers_count || 0,
                            access_token: encryptedAccessToken,
                            refresh_token: null, // Instagram uses long-lived tokens
                            token_expires_at: null, // Long-lived tokens don't expire
                            connected_at: new Date().toISOString(),
                            is_active: true,
                            metadata: {
                                followsCount: igAccount.follows_count,
                                mediaCount: igAccount.media_count,
                                pageName: igAccount.pageName,
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
                    logger.error('[Instagram Callback] Error storing account:', error);
                    throw new APIError(500, 'Failed to store Instagram account', 'DATABASE_ERROR');
                }

                return data;
            })
        );

        logger.info(`[Instagram Callback] Successfully stored ${accounts.length} accounts`);

        // Redirect to the original redirect URL with success message
        const redirectUrl = stateVerification.redirectUrl || '/x';
        const successUrl = new URL(redirectUrl, origin);
        successUrl.searchParams.set('success', 'instagram_connected');
        successUrl.searchParams.set('accounts', accounts.length.toString());

        return NextResponse.redirect(successUrl.toString());
    } catch (error) {
        console.error('[Instagram Callback] Error:', error);

        const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin || 'http://localhost:3000';
        const errorUrl = new URL('/x', origin);

        if (error instanceof APIError) {
            errorUrl.searchParams.set('error', error.message);
        } else if (error instanceof Error) {
            errorUrl.searchParams.set('error', error.message);
        } else {
            errorUrl.searchParams.set('error', 'Failed to connect Instagram account');
        }

        return NextResponse.redirect(errorUrl.toString());
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
